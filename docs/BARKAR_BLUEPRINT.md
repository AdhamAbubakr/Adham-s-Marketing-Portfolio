# BARKAR Marketing OS — Master Blueprint

**Version:** 1.2 · **Owner:** Adham Abo Bakr SalahElden · **Last updated:** 2026-05-17
**For:** Claude Code execution reference + team alignment

> **THIS IS THE SINGLE SOURCE OF TRUTH.** Read fully before generating any code.
> `[DECIDED]` = locked. `[CONFIRM]` = needs Adham's input before implementation.
> Reference section numbers in prompts (e.g. "Implement Phase 1 per §11").

---

## 1. Vision & Strategy

**Mission:** Build an internal operating system for Barkar marketing agency that automates and standardizes workflows, then evolve it into a SaaS product for other agencies, then a custom-development service for enterprises.

### Three-Stage Revenue Strategy
| Stage | Timeframe | Revenue Source | Validation |
|---|---|---|---|
| 1 | Months 0–6 | Agency service fees (Barkar clients) | Barkar runs entirely on the OS |
| 2 | Months 6–18 | SaaS subscriptions (other agencies) | 3+ paying agencies using it |
| 3 | Months 18+ | Custom OS contracts (enterprise) | Repeatable delivery process |

**Core principle:** Don't sell what you haven't used. Barkar operating successfully on the OS is the proof for SaaS customers.

---

## 2. Business Model Canvas (summary)

- **Customer Segments:** S1 SMEs/e-com MENA & Africa (SAMA Cape Town, GROOMI, Kayanac, MEDU…) → S2 small-medium agencies (5–50 staff) → S3 enterprise.
- **Value Props:** agencies — one platform replacing 8–10 tools; clients — transparent real-time dashboards + auto monthly reports; team — clear ownership, performance-linked pay, role knowledge base.
- **Revenue:** S1 retainers + project fees → S2 tiered SaaS (Starter/Growth/Scale) → S3 custom contracts + licensing.
- **Key resource:** the OS codebase. **Domain:** barkar.net.
- **Partners:** Supabase, Vercel, Hostinger, Anthropic, Meta/Google/TikTok, Paymob (EG), Stripe (intl).

---

## 3. Company Structure & Roles

Founder/CEO (Adham) → Sales/BDM · HR Director · Customer Success (S2) · [Future CTO]
Account Director → Account Manager → Project Coordinator (PM). Cross-cutting: **QA/Quality Reviewer** reviews every deliverable before it leaves the agency.

**Role definitions (each role has a dashboard, task queue, knowledge scope):**

| Role | Primary Responsibility | Dashboard Focus |
|---|---|---|
| Admin / Founder | Full system, contracts, strategy | Global KPIs, all clients, all team |
| Sales / BDM | Outbound, demos, brief intake | Pipeline, deals, conversion |
| Account Director | Oversees all accounts, escalations | Multi-client, workload, P&L |
| Account Manager | Owns assigned clients end-to-end | Their clients, comms, retention |
| Project Coordinator/PM | Orchestrates execution per project | Gantt, dependencies, blockers |
| Customer Success (S2) | Retention/expansion for SaaS tenants | Tenant health, usage, churn |
| HR | Performance, attendance, payroll | Team, hours, performance, payouts |
| QA / Quality Reviewer | Reviews deliverables pre-delivery | Review queue, rejections, quality |
| Media Buyer | Paid campaigns across platforms | Ad accounts, ROAS, spend |
| SEO Specialist | Organic, on-page, technical SEO | Rankings, traffic, keywords |
| Social Media Specialist | Calendar, community, engagement | Calendar, engagement, growth |
| Graphic Designer | Static creative | Design queue, brand assets |
| Videographer | On-location shoots, raw footage | Shoot schedule, equipment, uploads |
| Video Editor | Short/long-form post-production | Edit queue, raw footage, templates |
| Photographer | Product/lifestyle shoots | Shoot schedule, asset library |
| Content Creator | Long-form content, scripts | Calendar, scripts, briefs |
| Copywriter | Ad copy, captions, landing copy | Copy requests, brand voice |
| Web Developer | Custom builds, integrations | Project queue, deploy status |
| Shopify Designer | Shopify stores | Theme builds, product setup |
| WordPress Designer | WordPress + WooCommerce | Site builds, plugins |
| Strategist | Marketing strategy, briefs | Strategy queue, client research |
| Client | Submit briefs, review, approve | Their campaigns, reports, team |

> ⚠️ Existing `signup.html` lists Video Editor + Photographer only — the new app's signup must add **Videographer** as a distinct role.

---

## 4. System Architecture [DECIDED]

```
USER LAYER: Public · Clients · Team · Admin
   barkar.net (Hostinger, static HTML — marketing) │ app.barkar.net (Next.js 14+, Vercel — THE OS)
                         └── shared auth & data ──→ SUPABASE
SUPABASE: Auth(JWT/OAuth) · Postgres+RLS · Storage · Realtime · Edge Functions · pgvector(RAG)
EXTERNAL: Meta/Google/TikTok Ads · Paymob · Resend   │   AI: Claude API · Embeddings(RAG)
```

### Tech Stack [DECIDED]
| Layer | Choice |
|---|---|
| Marketing site | Static HTML on Hostinger (already built — KEEP) |
| App framework | **Next.js 14+ (App Router)** |
| App hosting | **Vercel** |
| Database | Supabase Postgres (RLS multi-tenancy) |
| Auth | Supabase Auth |
| Storage / Vector | Supabase Storage / pgvector |
| ORM | **Drizzle ORM** |
| Styling | Tailwind CSS |
| UI | shadcn/ui |
| Forms | React Hook Form + Zod |
| Data fetching | TanStack Query |
| Charts | Recharts → Tremor |
| Email | Resend (React Email) |
| AI | Anthropic Claude API |
| Payments | Paymob (EG) + Stripe (intl) |
| Jobs | Supabase Edge Functions + pg_cron |
| Monitoring | Vercel Analytics + Sentry |

**Subdomains:** `barkar.net` (marketing, Hostinger) · `app.barkar.net` (OS, Vercel) · `api.barkar.net` (webhooks) · `docs.barkar.net` (future SaaS docs).

---

## 5. Multi-Tenancy [DECIDED]

Single shared DB, **`tenant_id` column on every tenant-scoped table**, enforced by RLS. First tenant: **Barkar Agency** (seeded at deploy).

**Rules:**
1. Every tenant-scoped table: `tenant_id uuid NOT NULL` FK → `tenants.id`.
2. RLS enabled on every tenant-scoped table.
3. No client-side tenant filtering — RLS handles it.
4. `auth.uid() → profiles.tenant_id` is the source of truth for every RLS policy.

```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_select" ON tasks FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "tenant_isolation_insert" ON tasks FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
-- UPDATE adds role conditions (assigned_to = auth.uid() OR role IN admin/director/manager)
```

---

## 6. User Types & Permissions

**3 top-level types:** `admin` (founder, full tenant) · `team_member` (scoped by role) · `client` (own data only).

Permissions matrix (R=read, W=write, "--"=none): Admin R/W all. Account Director mostly R, R/W reports. Account Manager R/W assigned. Specialist R/W own. HR R/W team profiles+payroll. Client R own (+ R/W own contracts/briefs self).

**Auth flow:** signup → `profiles` row (`user_type`, `role`). Team → `status=pending_approval` (HR/Admin activates). Client → `status=pending_brief` (must submit brief → `active`). Middleware redirect: admin→`/admin`, team_member→`/team/{role}`, client→`/client`.

---

## 7. Database Schema (Conceptual)

**Schema patterns [DECIDED] — every tenant-scoped table includes:** `id uuid pk`, `tenant_id uuid NOT NULL`, `created_at`, `updated_at` (trigger), `created_by`, `updated_by`, `deleted_at` (soft delete — NEVER hard delete; RLS filters `deleted_at IS NULL`). Shared `set_audit_columns` trigger. Translatable text uses JSONB `{"en":"","ar":""}`.

**Auth & Tenancy:** `tenants(id,name,slug,plan,settings jsonb)` · `profiles(id=auth.users.id, tenant_id, full_name, email, phone, country, user_type, role, status, avatar_url, bio, skills[], locale)`

**Clients & Projects:** `clients` · `briefs` · `contracts` · `projects` · `client_team_assignments`
**Tasks:** `tasks` · `task_comments` · `task_attachments` · `task_dependencies` · `task_status_history`
**Time & HR:** `time_entries` · `attendance` · `performance_periods`
**Ad Integrations:** `ad_accounts`(tokens encrypted) · `ad_campaigns` · `ad_metrics_daily`
**Reports:** `report_templates` · `reports`
**DAM:** `assets` · `asset_versions` · `asset_collections` · `asset_collection_items` · `asset_tags` · `asset_tag_assignments` · `brand_guidelines`
**Knowledge & AI:** `knowledge_articles` · `ai_tool_updates` · `chatbot_conversations` · `chatbot_messages` · `knowledge_embeddings(vector(1536))`
**Notifications:** `notifications`
**Billing:** `payment_methods` · `payouts` · `client_invoices`
**Audit:** `audit_log`

---

## 8. Modules (Bounded Contexts)

Organized by feature, not file type. Each module owns its UI + server actions + types + DB access.

| # | Module | Phase |
|---|---|---|
| 1 | Identity & Access (signup, login, profile, roles, invites) | 0 |
| 2 | CRM (clients, briefs, contracts, projects) | 2 |
| 3 | Task Management (tasks, comments, deps, time) | 1 |
| 4 | HR (profiles, performance, attendance) | 1–2 |
| 5 | Asset Management / DAM (assets, versions, collections, tags, brand) | 1–2 |
| 6 | Ad Integrations (Meta/Google/TikTok adapters) | 3 |
| 7 | Reporting (templates, generation, exports) | 3 |
| 8 | Knowledge Base (articles, AI tool feed) | 4 |
| 9 | AI Assistant (role-scoped RAG chatbot) | 4 |
| 10 | Notifications (in-app + email) | 1 |
| 11 | Billing & Payouts (invoices, methods, payouts) | 5 |
| 12 | Audit (log + viewer) | Throughout |

**DAM is a core domain, not afterthought.** Upload (drag/bulk/API), auto-metadata, tagging (manual+AI), collections, versioning, status workflow (draft→in_review→approved→published→archived), brand guidelines per client, semantic search via embeddings. Storage path: `tenant_id/clients/{client_id}/assets/{asset_id}/{version}/{filename}`. Without DAM the team dumps files in WhatsApp/Drive and the OS becomes useless for coordination.

**Repo structure:** `/app/(public)` `/app/(dashboard)/{admin,director,manager,team/[role],client,hr}` `/app/api/webhooks` · `/lib/{supabase,auth,ad-platforms,ai,reporting,payments,email}` · `/components/{ui,dashboard,tasks,clients,charts}` · `/supabase/{migrations,functions}` · `/docs`.

---

## 9. Critical User Flows

- **9.1 Client onboarding:** barkar.net → signup (Client) → profiles(pending_brief) → verify → /client → submit brief → Admin/Director notified → AM assigned → strategy → client approves → contract → signed → active → project created → team allocated → monthly reports.
- **9.2 Team onboarding:** signup (Team Member + role) → pending_approval → HR approves → active → complete profile (portfolio, skills, bank) → assigned to projects.
- **9.3 Task lifecycle:** AM creates+assigns (due, value) → notify → Start (time_entries begins) → work+comments → Done (completed_pending_review) → AM reviews → confirm → closed → counts to performance/payout.
- **9.4 Monthly reporting:** 1st@06:00 UTC pg_cron → per active client: fetch ad_metrics_daily → aggregate → apply template (PDF+Excel) → Storage → notify client+AM.
- **9.5 Payout cycle:** month-end HR triggers calc → per member: `SUM(task.value WHERE closed)` OR `SUM(time)×rate` → HR reviews/approves → payouts pending → Paymob (EG) → paid → notify.

---

## 10. Integrations Roadmap

| Integration | Phase | Notes |
|---|---|---|
| Supabase Auth | 0 | Built-in |
| Resend (Email) | 1 | Transactional |
| Meta Marketing API | 3 | **App review 4–6 wks — submit early in Phase 2** |
| Google Ads API | 3 | OAuth + dev token |
| TikTok Ads API | 3 | OAuth |
| Anthropic Claude | 4 | Chatbot + RAG |
| Paymob / Stripe | 4–5 | Local / intl |
| WhatsApp Business | 5 | Optional |
| DocuSign / e-sign | 5 | Replace manual contract upload |

---

## 11. Build Phases

- **Phase 0 — Foundation (Wk 1–2):** Next.js 14 on Vercel + GitHub; Supabase configured; `tenants`/`profiles`+RLS; Barkar tenant seeded; auth flows (signup client+team, login, reset, verify); role middleware; empty dashboards (admin/director/manager/each role/HR/client); `app.barkar.net`→Vercel; CI/CD. **DoD:** Adham signs up as admin, creates fake team+client, sees empty dashboards. *Also: next-intl installed, locale switcher, UI strings in /messages/{en,ar}.json.*
- **Phase 1 — Internal Ops MVP (Wk 3–8):** Task system (create/assign/status/comments/attachments); time tracking; notifications (in-app+email); admin/director/manager/specialist/HR dashboards; basic profile pages. **DoD:** Barkar's real team uses the OS for one full week of real work.
- **Phase 2 — Client Portal (Wk 9–12):** client signup+approval; multi-step brief form (uploads); brief review; contract upload+ack; client dashboard; AM client view. **DoD:** new client completes signup→brief→contract without hand-holding.
- **Phase 3 — Ad Integrations (Wk 13–20):** Meta OAuth+encrypted tokens; daily sync Edge Function; Media Buyer live dashboards; client real metrics; Excel export (on-demand + scheduled monthly). **DoD:** Media Buyer sees live Meta metrics; client gets generated monthly Excel.
- **Phase 4 — AI + Knowledge + Google Ads (Wk 21–24):** KB CRUD+reader; AI tool feed; RAG chatbot (role-scoped, Claude); Google Ads; PDF reports. **DoD:** specialist asks chatbot a role question, gets KB-grounded answer.
- **Phase 5 — Payments & Polish (Wk 25–30):** payout engine (task+hourly); Paymob payouts; client invoicing; audit viewer; HR performance dashboards; mobile-responsive polish. **DoD:** full month closes inside the OS.
- **Phase 6+ — SaaS conversion (Mo 7+):** tenant self-serve signup; Stripe subscriptions; onboarding wizard; tenant admin+branding; SaaS marketing page; customer success.

---

## 12. Build Conventions (for Claude Code)

- **Server Components by default**; `'use client'` only when needed. **Server Actions** for mutations (avoid API routes except external).
- Type-safe end-to-end: `supabase gen types`. **Zod** for every form/action input. No raw SQL in components — all DB via `/lib/supabase/`. No business logic in components.
- **Auth:** middleware on every protected route; layouts re-check user type server-side; **RLS is the security boundary** (never trust client role checks).
- **Naming:** tables plural snake_case; components PascalCase.tsx; hooks useCamelCase; server actions verb-noun; route groups in parens.
- **Migrations:** `supabase migration new <name>`; one per feature; RLS in same migration as table; never edit applied migrations — create new; destructive migrations need Adham's explicit approval.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- A short **CLAUDE.md** lives in repo root (summary, stack, conventions, pointer here).

---

## 13. Open Decisions & TODOs [CONFIRM — needs Adham]

| # | Topic | Question | Phase |
|---|---|---|---|
| 1 | Vercel account | Created? Connected to GitHub? | 0 |
| 2 | Next.js experience | Adham's level (prompt verbosity)? | 0 |
| 3 | Existing Supabase | Audit current tables before Phase 0 migrations | 0 |
| 4 | Current team size | How many use OS day 1? | 1 |
| 5 | Active clients count | How many to migrate? | 2 |
| 6 | Phase 1 highest-pain feature | If only one ships, which? | 1 |
| 7 | SaaS pricing model | Per-seat / per-tenant / hybrid? | 6 |
| 8 | Paymob account | Registered? KYC? | 5 |
| 9 | Branding for app | Same as marketing or variant? | 0 |
| 10 | KB content | Who writes initial articles? | 4 |
| 11 | E-signature | DocuSign / HelloSign / manual? | 2 |
| 12 | Hourly rates / task values | Standard rate or per-task per role? | 5 |

---

## 14. Out of Scope (v1)

Native mobile apps · white-label (P6+) · advanced BI · AI auto-optimization · multi-currency beyond EGP/USD/SAR · SOC2 · in-app calls/messaging · public API · freelancer marketplace.

---

## 15. Security & Compliance [DECIDED]

- **Data tiers:** P0 tokens/creds → Supabase Vault, never to client. P1 PII (national IDs, bank) → encrypted/RLS+logged. P2 briefs/contracts, P3 ops → standard RLS. P4 profile names → tenant-scoped readable.
- **Secrets:** ad tokens in `ad_accounts.access_token_encrypted` (Vault), decrypt only in Edge Functions. App secrets in Vercel env (per-env, never in Git). Service role key server-only.
- **Auth hardening:** min 10-char passwords; 2FA required admin+director from P0; 7-day refresh/1-hr access; 5-attempt→15-min lockout; email-enumeration protection.
- **Compliance:** Egyptian Law 151/2020, Saudi PDPL, GDPR (deferred). Privacy Policy + ToS before P2; DPA template; cookie consent; right-to-erasure via tenant export-and-delete; audit log on P1 access.
- **Backup/DR:** daily Supabase backups 7-day retention; PITR before P3; RTO 4h; RPO 24h (1h after P3); quarterly DR drill.
- **Incident response:** contain → assess (audit log) → notify ≤72h (Adham approves comms) → remediate → post-mortem `/docs/incidents/`.

---

## 16. i18n & Localization [DECIDED]

**Arabic + English bilingual from Phase 0 — non-negotiable for MENA.**
- Library **next-intl**; prefix routing `/en/...` `/ar/...`; `lang`/`dir` per request; **CSS logical properties only** (`ms-4`/`me-4`, `text-start`/`text-end`).
- Translatable DB content → JSONB `{"en","ar"}`. UI strings → next-intl message files. Free text (briefs, comments, chat) stored as submitted.
- Amounts stored in cents/piastres `bigint`; display currency separate from storage.
- RTL: mirror directional icons only (`scaleX(-1)`); reverse animations; `dir="auto"` on text inputs.
- P0: next-intl + locale switcher + strings extracted (placeholders OK). P2: full Arabic pass before client portal.

---

## 17. Environments & Deployment [DECIDED]

- **3 environments:** Local (Docker Supabase) · Staging (`staging.app.barkar.net`, `barkar-staging` Supabase) · Production (`app.barkar.net`, `barkar-prod` Supabase). **Never share DBs across envs.**
- **Branches:** `main`→prod (auto-deploy on merge); `staging`→staging; `feat/*`→Vercel preview (PR→staging); `hotfix/*`→PR direct to main then back-merge.
- **Migrations:** local→feat (dev Supabase)→staging→main (prod). Never edit post-merge. Backward-compatible one cycle. Destructive needs Adham approval.
- **DNS:** `@`→Hostinger (marketing), `app`→`cname.vercel-dns.com`, `staging.app`→Vercel, MX→Hostinger, SPF/DKIM/DMARC required before Phase 1 (email deliverability).
- **Monitoring:** Sentry + Vercel Analytics from P0; UptimeRobot from P2.

---

## Glossary

Tenant = an agency using the OS (Barkar = #1) · RLS = Row Level Security · RAG = Retrieval Augmented Generation · Brief = client requirements doc · DAM = Digital Asset Management · PDPL = Saudi data law · DPA = Data Processing Agreement · RTO/RPO = recovery time/point objective · i18n = internationalization · Vault = Supabase encrypted secrets.

---

## ⚠️ Architecture Reality Note (current state vs blueprint)

The **current production system** is static HTML on Hostinger (`index/admin/team/portal/signup.html` + JS modules + Supabase, no `tenant_id`). The blueprint mandates a **separate new Next.js 14 app** on `app.barkar.net` (Vercel) with proper multi-tenancy.

**Resolution (non-destructive):** `barkar.net` static site **stays** as the marketing site (blueprint §4 confirms). The OS is a **fresh Next.js build** — it does **not** replace or destroy the live marketing site. Existing Supabase tables need an **audit (§13 #3)** before Phase 0 migrations because the new schema uses `tenant_id` on everything.
