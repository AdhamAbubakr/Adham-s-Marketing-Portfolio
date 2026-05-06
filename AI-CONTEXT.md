# AI Context Brief — Adham's Marketing Platform

> **How to use:** Paste this entire file into any new AI chat (Claude, ChatGPT, Gemini, etc.) before asking for edits. It gives the AI everything it needs to continue the work.

> **Companion docs:**
> - `project-summary.html` — full architectural blueprint (printable PDF)
> - `database-backup.sql` — complete schema for disaster recovery
> - `MIGRATION-GUIDE.md` — Free → Paid infra migration steps

---

## Project
What started as a personal portfolio is now an **agency operations platform / SaaS prototype** — multi-tenant with auth, role separation (admin/client), per-client dashboards, lead capture, and tracking-pixel management. Owner is **Adham Abo Bakr SalahElden**, a Digital Marketing Specialist building a marketing agency around this platform.

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
1. `index.html` — Public portfolio (hero, impact counters, about, services, case studies, skills, resume, process, lead form)
2. `signup.html` — Client signup + login (combined tabs)
3. `portal.html` — Client portal post-login (service selection on first login, then service-based dashboards)
4. `admin.html` — Admin command center (Overview / Clients / Leads / Pixels tabs)
5. `brand-guide.html` — 9-page printable brand identity PDF
6. `project-summary.html` — Full architectural blueprint PDF
7. `tracking.js` — Loads pixel IDs from Supabase + injects them site-wide
8. `supabase-config.js` — Public anon key + Web3Forms key

## Database tables (Supabase project rgofucjhmiiyygbcnoim)
- `leads` — public form submissions (anyone INSERT, admin SELECT/UPDATE/DELETE)
- `site_settings` — pixel IDs + custom code (anyone SELECT, admin write)
- `clients` — brands; has `auth_user_id`, `services[]`, `platforms[]`, contact info
- `client_campaigns` — per-client campaigns + `external_url` (link to Meta/Google ad manager)
- `client_metrics` — daily numbers per client (spend, reach, conversions, revenue, etc.)
- `client_activity` — action log per client
- `user_roles` — `role` is `'admin'` or `'client'`; trigger auto-assigns `'client'` on signup
- Helper function `is_admin()` — checks if `auth.uid()` has admin role

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
