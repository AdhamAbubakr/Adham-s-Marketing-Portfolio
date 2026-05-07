# AI Context Brief — Barkar. Agency Platform

> **How to use:** Paste this entire file into any new AI chat (Claude, ChatGPT, Gemini, etc.) before asking for edits. It gives the AI everything it needs to continue the work.

> **Companion docs:**
> - `project-summary.html` — full architectural blueprint (printable PDF)
> - `database-backup.sql` — complete schema for disaster recovery
> - `MIGRATION-GUIDE.md` — Free → Paid infra migration steps

---

## Project
**Barkar.** is a coined brand name — distinctive, memorable, and intentionally without preset meaning so it can be defined by the work itself. Barkar is a digital marketing agency operations platform / SaaS prototype — multi-tenant with auth, role separation (admin/client), per-client dashboards, lead capture, and tracking-pixel management.

**Founder:** Adham Abo Bakr SalahElden (Digital Marketing Specialist, Egypt).
**Tagline:** "Built different."
**Brand wordmark:** Always written `Barkar.` with a magenta period (#EC4899).
**Domain:** barkar.net (registered on Hostinger, May 2026).

## Owner / Contact
- **Name:** Adham Abo Bakr SalahElden
- **Email:** adhambakrsalah@gmail.com
- **Phone / WhatsApp:** +20 104 472 4144 (preferred — confirmed by owner)
- **Location:** Egypt
- **GitHub:** https://github.com/AdhamAbubakr
- **Repo:** https://github.com/AdhamAbubakr/Adham-s-Marketing-Portfolio
- **Live site:** Netlify (auto-deploys from `main` branch on push)

## Stack
- Single-page **HTML + CSS + vanilla JS** (no frameworks, no build step)
- Single file: `index.html` (~1500 lines)
- Resume PDF: `Adham-Abo-Bakr-Resume.pdf`
- Local folder: `D:\Claude Code\portfolio`
- Local preview: `python -m http.server 5173` → http://localhost:5173

## Brand Identity
- **Primary purple:** `#7C3AED`
- **Light purple:** `#9D5CF8`
- **Accent:** `#C084FC`
- **Background:** `#07070C` (near-black)
- **Card:** `#1A1A24`
- **Display font:** Space Grotesk (700)
- **Body font:** Inter
- **Logo mark:** Letter `A` on purple gradient rounded square
- **Wordmark:** "Adham." with purple period

## Pages in the platform
1. `index.html` — Public portfolio + lead form
2. `signup.html` — Combined signup/login with role-based redirect (admin → admin.html, client → portal.html, team → team.html)
3. `portal.html` — Client portal (services + brief + strategy view + content approval + contract signing)
4. `admin.html` — Admin command center with 10 tabs:
   Overview · Clients · Briefs · Strategies · Content · Team · Tasks · Contracts · Leads · Pixels
5. `team.html` — Team Portal (task list + status updates per team member)
6. `brand-guide.html` — Printable brand identity PDF
7. `project-summary.html` — Full architectural blueprint PDF
8. `tracking.js` — Loads pixel IDs from Supabase + injects them site-wide
9. `supabase-config.js` — Public anon key + Web3Forms key

## Database tables (Supabase project rgofucjhmiiyygbcnoim)
**Phase 1-3 (live):**
- `leads` — public form submissions
- `site_settings` — pixel IDs + custom code
- `clients` — brands; has `auth_user_id`, `services[]`, `platforms[]`
- `client_campaigns` — per-client campaigns + `external_url`
- `client_metrics` — daily numbers per client
- `client_activity` — action log per client
- `client_briefs` — multi-step questionnaire answers (JSONB)
- `marketing_strategies` — versioned strategies linked to briefs
- `user_roles` — `role` is `'admin'` | `'client'` | `'team'`
- Helper function `is_admin()` — used in RLS

**Phase 4-8 (schema written, run `phase4-8-schema.sql` in Supabase):**
- `content_items` — content calendar items (post/story/reel/etc) with status workflow
- `content_files` — files attached to content (designs, videos)
- `content_comments` — comments thread per content item
- `team_members` — remote team member profiles
- `tasks` — task assignments + time tracking
- `time_logs` — time tracking entries
- `contracts` — client contracts with e-signature support
- `invoices` — invoicing tied to contracts
- `notifications` — in-app notifications
- `audit_log` — activity audit trail

## Multi-tenant security (RLS)
- **Admin** (Adham, role='admin') sees everything
- **Client** (role='client') sees only rows linked to their `auth_user_id` via `clients` table
- All policies use `is_admin()` for full access OR `auth_user_id = auth.uid()` filter

## Brands Adham has worked with
SAMA Cape Town (KSA + South Africa), SAMA Transportation, GROOMI Wear, Kayanac ERP, Kitaan, The Old Days, Infinity Store, Amazing Store, MEDU Science, WOLVES Store, أكاديمية التفوق, Nader Sunglasses (Kuwait), Ayam Zaman (Kuwait), ببساطة أتعلم.

⚠️ Do NOT include "نبادر" / Nabader — Adham did not work with this brand.

## Key user preferences (IMPORTANT)
- ❌ DO NOT use Meduscience-only numbers (he wants combined results across all brands, not just one)
- ✅ SAMA Cape Town operates in **BOTH Saudi Arabia AND South Africa**
- ✅ Aggregate counters across ALL projects, not per-brand fragmented numbers
- ✅ Title is **Digital Marketing Specialist** (not "Media Buyer")
- ✅ Dark purple/black/grey theme matching his Canva portfolio
- ✅ Keep design "strong enough to get hired remotely"

## Deployment workflow
1. Edit `index.html` locally
2. `cd "D:/Claude Code/portfolio"`
3. `git add -A && git commit -m "describe change" && git push`
4. Netlify auto-deploys in ~10 seconds

## How to brief a new AI
> "I have a portfolio site at `D:\Claude Code\portfolio\index.html` deployed via Netlify from GitHub. Read `AI-CONTEXT.md` first, then [your task here]. After changes, run `git add -A && git commit -m "..." && git push`."

## Common tasks the AI might be asked
- Update aggregate numbers in `#impact` and `#case-studies` sections
- Add a new brand to the brands strip in `#case-studies`
- Change copy or contact info
- Add a new project as a timeline item in `#resume`
- Tweak colors via the `:root` CSS variables
- Add a new section (testimonials, blog, etc.)
- Build new admin features (briefs, content calendars, file approvals)
- Build new portal features for clients (reports, notifications)
- Migrate to Hostinger / Supabase Pro (see MIGRATION-GUIDE.md)
- Add new database tables — always include RLS policies + admin/client access split

## Current completion ~30-35% of the long-term agency-platform vision
**Done:** Public portfolio · Brand identity · Lead capture · Admin dashboard (basics) · Multi-tenant auth · Tracking pixels · Per-client metrics + campaigns
**Pending:** Client brief intake form · Marketing strategy module · Content calendar + approvals · File storage/sharing · Team/employee portal · Content scheduling · Monthly PDF reports · API integrations (Meta/Google/TikTok)

## Free tier limits to watch
- Netlify Free: 100 GB bandwidth/month — fine for low traffic
- Supabase Free: 500 MB DB + 5 GB bandwidth + pauses after 7 days inactive
- Web3Forms Free: 250 emails/month
- When approaching limits: see MIGRATION-GUIDE.md for Hostinger + Supabase Pro upgrade
