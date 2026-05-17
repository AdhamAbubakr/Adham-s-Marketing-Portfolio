# Barkar OS — Next.js App (Phase 0 scaffold)

The OS per `../docs/BARKAR_BLUEPRINT.md` (single source of truth). Lives at `app.barkar.net` (Vercel). The static marketing site at repo root stays on Hostinger — this folder does NOT touch it.

## Status: Phase 0 scaffold (code only)
Node is **not installed** on this machine yet, and the new Supabase project / Vercel account don't exist yet — so this is the **code skeleton**, ready to `npm install` + wire when those are ready.

## Stack (blueprint §4)
Next.js 14 App Router · Supabase (`@supabase/ssr`) · next-intl (AR default + EN, RTL) · Drizzle · Tailwind · Zod · TanStack Query · Recharts.

## What's scaffolded
```
barkar-os/
  package.json                 deps pinned to blueprint stack
  next.config.mjs              next-intl plugin wired
  tsconfig / tailwind / postcss / .gitignore / .env.example
  i18n/request.ts              locales = [ar, en], default ar (§16)
  middleware.ts                next-intl + Supabase session refresh
  messages/{ar,en}.json        UI strings (placeholders, expand per feature)
  lib/supabase/
    server.ts  client.ts  middleware.ts   (§12 patterns + §6 role redirect)
  app/[locale]/
    layout.tsx                 sets lang + dir=rtl for Arabic (§16)
    page.tsx                   → redirects to /login
  supabase/migrations/
    0000_foundation.sql        §5/§6/§7 — tenants, profiles, RLS,
                               audit trigger, soft delete, signup hook,
                               Barkar seeded as tenant #1
```

## To run (once prerequisites exist)
1. Install **Node 20+** (https://nodejs.org).
2. Create the **new clean Supabase project** (blueprint §13 #3 decision = new project).
3. `cp .env.example .env.local` → fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Run `supabase/migrations/0000_foundation.sql` in the new Supabase SQL Editor.
5. `npm install` → `npm run dev` → open `http://localhost:3000/ar`.
6. Connect repo to **Vercel**, set root dir = `barkar-os/`, add env vars, point `app.barkar.net` → `cname.vercel-dns.com` (§17.6).

## Remaining Phase 0 (next sessions, per blueprint §11)
- Auth pages: `/[locale]/login`, `/[locale]/signup` (client + team, role select incl. **Videographer** §3 note) using Supabase Auth + Zod.
- Empty role dashboards under `app/[locale]/(dashboard)/{admin,director,manager,team/[role],client,hr}` + server-side user-type guards in each layout (§6, §12).
- next-intl locale switcher in header.
- **DoD (§11):** Adham signs up as admin → creates fake team + client → logs in as each → sees empty dashboards.

Then Phase 1 = Task Management module (§7, §8, §9.3).
