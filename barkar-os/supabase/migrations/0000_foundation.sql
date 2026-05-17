-- =============================================================================
-- Barkar OS — Phase 0 Foundation Migration
-- Implements BARKAR_BLUEPRINT §5 (multi-tenancy), §6 (user types), §7 (schema patterns)
-- =============================================================================
-- This is the BEDROCK schema for the NEW Supabase project (clean, fresh).
-- Every tenant-scoped table follows the §7 standard column pattern.
-- =============================================================================

-- ---- Extensions ----
create extension if not exists "pgcrypto";
create extension if not exists "vector";        -- §7 knowledge_embeddings (RAG)

-- =============================================================================
-- TENANTS  (blueprint §5 — first tenant = Barkar, seeded below)
-- =============================================================================
create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  plan        text not null default 'internal',   -- internal | starter | growth | scale
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- =============================================================================
-- PROFILES  (id == auth.users.id) — §6 user types & roles
-- =============================================================================
do $$ begin
  create type public.user_type as enum ('admin','team_member','client');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.profile_status as enum ('pending_approval','pending_brief','active','suspended','rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id),
  full_name   text,
  email       text,
  phone       text,
  country     text,
  user_type   public.user_type not null default 'team_member',
  role        text,                                 -- specialist role key (team_member only)
  status      public.profile_status not null default 'pending_approval',
  avatar_url  text,
  bio         text,
  skills      text[] not null default '{}',
  locale      text not null default 'ar',           -- §16 i18n: 'ar' | 'en'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id),
  updated_by  uuid references public.profiles(id),
  deleted_at  timestamptz
);

create index if not exists profiles_tenant_idx on public.profiles(tenant_id);
create index if not exists profiles_role_idx   on public.profiles(role);

-- =============================================================================
-- §7 SHARED AUDIT TRIGGER  (auto updated_at / updated_by)
-- Attach to every tenant-scoped table going forward.
-- =============================================================================
create or replace function public.set_audit_columns()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  begin
    new.updated_by := auth.uid();
  exception when others then
    -- auth.uid() unavailable (e.g. service role / migration) — leave as-is
    null;
  end;
  return new;
end;
$$;

drop trigger if exists tenants_audit  on public.tenants;
create trigger tenants_audit  before update on public.tenants
  for each row execute function public.set_audit_columns();

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit before update on public.profiles
  for each row execute function public.set_audit_columns();

-- =============================================================================
-- TENANCY HELPERS  (§5 — source of truth for every RLS policy)
-- =============================================================================
create or replace function public.current_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.current_user_type()
returns public.user_type language sql stable security definer set search_path = public as $$
  select user_type from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.current_role_key()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and user_type = 'admin' and deleted_at is null);
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.tenants  enable row level security;
alter table public.profiles enable row level security;

-- TENANTS: members see only their own tenant; admin manages it
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants for select to authenticated
  using (id = public.current_tenant_id() and deleted_at is null);

drop policy if exists tenants_admin on public.tenants;
create policy tenants_admin on public.tenants for all to authenticated
  using (id = public.current_tenant_id() and public.is_admin())
  with check (id = public.current_tenant_id() and public.is_admin());

-- PROFILES: tenant isolation + self-management
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (tenant_id = public.current_tenant_id() and deleted_at is null);

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and tenant_id = public.current_tenant_id());

drop policy if exists profiles_admin_manage on public.profiles;
create policy profiles_admin_manage on public.profiles for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

-- =============================================================================
-- SEED — Barkar = tenant #1  (§5)
-- =============================================================================
insert into public.tenants (id, name, slug, plan)
values ('00000000-0000-0000-0000-000000000001', 'Barkar Agency', 'barkar', 'internal')
on conflict (slug) do nothing;

-- =============================================================================
-- AUTH HOOK — auto-create a profile row on signup
-- (user_type/role/locale come from auth metadata set at signup; defaults to
--  team_member + pending_approval. Client signup overrides to pending_brief.)
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_type   public.user_type := coalesce((new.raw_user_meta_data->>'user_type')::public.user_type, 'team_member');
  v_status public.profile_status;
begin
  v_status := case
    when v_type = 'client' then 'pending_brief'::public.profile_status
    when v_type = 'admin'  then 'active'::public.profile_status
    else 'pending_approval'::public.profile_status
  end;

  insert into public.profiles (id, tenant_id, full_name, email, user_type, role, status, locale)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'tenant_id')::uuid, '00000000-0000-0000-0000-000000000001'),
    new.raw_user_meta_data->>'full_name',
    new.email,
    v_type,
    new.raw_user_meta_data->>'role',
    v_status,
    coalesce(new.raw_user_meta_data->>'locale', 'ar')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
