# CLAUDE.md — Barkar Marketing OS

## Project Summary
Barkar Marketing OS is an internal operating system for the Barkar marketing agency that automates and standardizes agency workflows (clients, briefs, tasks, time, ads, reports, payouts, knowledge). It evolves in 3 stages: (1) run Barkar on it, (2) sell it as multi-tenant SaaS to other agencies, (3) custom enterprise OS contracts.

There are **two surfaces**: `barkar.net` is the existing **static marketing site** on Hostinger (KEEP as-is — it is the public site). `app.barkar.net` is **the OS** — a new **Next.js 14 (App Router)** app on Vercel, backed by Supabase (Postgres + Auth + Storage + RLS multi-tenancy + pgvector). The OS is a fresh build and does **not** replace the marketing site.

## Canonical Reference
**`docs/BARKAR_BLUEPRINT.md` is the single source of truth.** Read it fully before any code. Reference sections in prompts (e.g. "per §7, §12"). `[DECIDED]` = locked; `[CONFIRM]` = needs Adham.

## Tech Stack [DECIDED]
Next.js 14 App Router · Vercel · Supabase (Postgres/Auth/Storage/RLS/pgvector) · Drizzle ORM · Tailwind · shadcn/ui · React Hook Form + Zod · TanStack Query · Recharts · Resend · Claude API · Paymob+Stripe · Supabase Edge Functions + pg_cron · Sentry. **i18n: next-intl, Arabic+English from Phase 0, RTL via CSS logical properties.**

## Critical Conventions
- Server Components by default; Server Actions for mutations. No raw SQL / business logic in components.
- **Multi-tenancy:** every tenant-scoped table has `tenant_id uuid NOT NULL` + RLS. RLS is the security boundary — never trust client role checks. Source of truth: `auth.uid() → profiles.tenant_id`.
- **Audit columns + soft delete** on every tenant-scoped table (`created_by/updated_by/deleted_at`, never hard delete).
- Translatable text → JSONB `{"en","ar"}`. UI strings → next-intl message files.
- Migrations: one per feature, RLS in same migration, never edit applied ones, destructive needs Adham approval.
- Conventional Commits. Naming: tables plural snake_case, components PascalCase, server actions verb-noun.

## Current State / Migration Note
Legacy static system (`*.html` + `*.js` + several `*.sql`) is live and is the **marketing site / interim agency tooling**. The Next.js OS is being built fresh. Existing Supabase tables must be **audited (§13 #3)** before Phase 0 migrations since the new schema mandates `tenant_id` everywhere. Do not destructively alter the production Supabase without Adham's explicit approval.

## Build Order
Phase 0 Foundation → 1 Internal Ops MVP → 2 Client Portal → 3 Ad Integrations → 4 AI+Knowledge → 5 Payments+Polish → 6+ SaaS. Details in blueprint §11.
