# 🚀 Athar. — Complete Build Plan

> From MVP (35%) → Full Agency Platform (100%)
> Timeline: ~16 weeks (4 months) of building
> Owner: Adham Abo Bakr SalahElden | Started: May 2026

---

## 🎯 The Architecture (Final)

```
┌──────────────────────────────────────────┐
│  HOSTINGER CLOUD STARTUP ($9.99/mo)      │
│  • Hosting (athar.agency domain)         │
│  • Business Emails (100 inboxes)         │
│  • 200 GB File Storage                   │
│    └── client videos, designs, content   │
│  • Auto-deploy from GitHub               │
└──────────────────────────────────────────┘
                    ↕
┌──────────────────────────────────────────┐
│  SUPABASE (Free → Pro at $25/mo)         │
│  • PostgreSQL Database                   │
│  • Authentication (admin/client/team)    │
│  • Row Level Security (multi-tenant)     │
│  • Real-time updates                     │
│  • Auto-generated APIs                   │
│  • Edge Functions for automation         │
└──────────────────────────────────────────┘
                    ↕
┌──────────────────────────────────────────┐
│  GITHUB (Source of Truth)                │
│  • All code versioned                    │
│  • Claude Code controls everything       │
│  • Push → Auto-deploy to Hostinger       │
└──────────────────────────────────────────┘
```

---

## 📊 Where We Are vs Where We're Going

```
Current MVP (✅ Done):           ████████░░░░░░░░░░░░  35%

After Phase 3:                   ████████████░░░░░░░░  55%
After Phase 4:                   ██████████████░░░░░░  70%
After Phase 5:                   ████████████████░░░░  82%
After Phase 6:                   █████████████████░░░  88%
After Phase 7:                   ███████████████████░  95%
After Phase 8 (Launch):          ████████████████████  100%
```

---

# 📅 PHASE-BY-PHASE BREAKDOWN

## 🟣 PHASE 0 — Migration & Setup (Week 1)

### 🎯 Goal
نقل المنصة من Netlify → Hostinger، تفعيل الدومين، setup professional emails.

### 📋 Tasks
- [ ] Buy Hostinger Cloud Startup (48 months)
- [ ] Register `athar.agency` domain
- [ ] Activate Business Email accounts:
  - `adham@athar.agency`
  - `contact@athar.agency`
  - `team@athar.agency`
- [ ] Connect GitHub repo to Hostinger Git
- [ ] Set up auto-deploy webhook
- [ ] Update DNS records
- [ ] Update Supabase Site URL
- [ ] Update Web3Forms email destination
- [ ] Setup Hostinger File Storage folder structure:
  ```
  /public_html/uploads/
    └── clients/
        ├── [client-id]/
        │   ├── designs/
        │   ├── videos/
        │   ├── briefs/
        │   └── reports/
  ```
- [ ] Test end-to-end: signup, login, form, admin

### 🛠️ Deliverables
- ✅ `https://athar.agency` live
- ✅ Auto-deploy from GitHub working
- ✅ Email infrastructure ready
- ✅ Storage system ready

### 👤 What Adham Does
- Buy Hostinger
- Send me the domain name + Hostinger username
- Apply for Meta Developer App (in parallel)
- Apply for Google Ads Developer Token (in parallel)

### 🤖 What Claude Code Does
- All technical migration
- DNS configuration
- Supabase updates
- Testing

---

## 🟣 PHASE 3 — Client Onboarding System (Weeks 2-3)

### 🎯 Goal
العميل يعمل sign up → يملأ Brief Form → الـ Strategy تتعمل → يعتمدها → بدفع يفتح PDF.

### 🆕 New Database Tables
```sql
client_briefs (
  id, client_id, status, answers (JSONB),
  submitted_at, reviewed_at, version
)

marketing_strategies (
  id, client_id, brief_id, version,
  title, content (JSONB), pdf_url,
  status (draft/sent/approved),
  is_paid_unlocked, created_at
)

strategy_revisions (
  id, strategy_id, content_diff,
  changed_by, created_at
)
```

### 📝 Features to Build
1. **Multi-step Client Brief Form** (`portal/brief.html`)
   - Step 1: Business basics (name, industry, target market)
   - Step 2: Current marketing (what's working, what's not)
   - Step 3: Goals & KPIs (specific numbers)
   - Step 4: Brand voice & visuals
   - Step 5: Budget & timeline
   - Auto-save progress
   - Email notification on submit
2. **Admin Brief Inbox** (`admin → Briefs tab`)
   - List all submitted briefs
   - View answers in clean format
   - Mark as "reviewed" / "in-progress" / "completed"
3. **Strategy Builder** (`admin → Strategies`)
   - Templated sections (Audience, Channels, Content Pillars, Ads, KPIs, Timeline)
   - Rich text editor for each section
   - Version control (v1.0, v1.1, v2.0…)
   - Link to client's brief
4. **Strategy Delivery** (`portal → My Strategy`)
   - Client sees strategy in nice layout
   - "Pay to download PDF" gate (locked until paid)
   - Comments / feedback area
   - Approve / Request changes buttons
5. **PDF Export**
   - Browser-based PDF generation
   - Branded with Athar. identity
   - Auto-uploaded to Hostinger storage

### ⏱️ Timeline
- Week 2: Brief form + admin inbox
- Week 3: Strategy builder + delivery + PDF export

---

## 🟣 PHASE 4 — Content Operations (Weeks 4-5)

### 🎯 Goal
Content Calendar + File Storage + Approval Workflow بين الأدمن والعميل.

### 🆕 New Database Tables
```sql
content_calendar (
  id, client_id, scheduled_date, platform,
  type (post/reel/story/ad), title, caption,
  hashtags, status (draft/review/approved/scheduled/published),
  assigned_to (team_member_id), created_at
)

content_files (
  id, content_id, file_type, hostinger_path,
  thumbnail_url, uploaded_by, version
)

content_comments (
  id, content_id, author_id, message,
  created_at, parent_id (for replies)
)

content_approvals (
  id, content_id, status (pending/approved/rejected),
  approver_id (client), feedback, decided_at
)
```

### 📝 Features
1. **Content Calendar Grid** (`admin/portal → Calendar`)
   - Weekly + monthly views
   - Drag-and-drop to reschedule
   - Color-coded by status
   - Filter by platform / client
2. **File Upload System**
   - Upload to Hostinger via PHP endpoint
   - Generate thumbnails for images/videos
   - Show storage usage per client
   - Version history
3. **Approval Workflow**
   - Admin creates content → status = "draft"
   - Admin marks "ready for review" → notification to client
   - Client opens in portal → can comment + approve/reject
   - Approved → status = "scheduled"
   - On scheduled date → admin marks "published"
4. **Comments Thread**
   - Inline on each content item
   - Real-time updates via Supabase channels
   - @mention team members

### ⏱️ Timeline
- Week 4: Calendar + Files
- Week 5: Approvals + Comments + Notifications

---

## 🟣 PHASE 5 — Team Portal & Task Management (Weeks 6-7)

### 🎯 Goal
الموظفين يدخلوا لـ Portal خاص بيهم، يشوفوا مهامهم، يرفعوا الشغل.

### 🆕 New Database Tables
```sql
-- Add 'team' role to user_roles
ALTER TABLE user_roles ALTER COLUMN role SET 
  CHECK (role IN ('admin','client','team'));

team_members (
  id, auth_user_id, full_name, role_title,
  skills[], hourly_rate, country,
  joined_at, status (active/paused)
)

tasks (
  id, client_id, content_id, assigned_to,
  title, description, type (design/video/copy/seo/ads),
  priority, status (todo/in-progress/review/done),
  due_date, started_at, completed_at,
  estimated_hours, actual_hours
)

time_logs (
  id, task_id, team_member_id,
  start_time, end_time, duration_minutes, notes
)
```

### 📝 Features
1. **Team Portal** (`team.html`)
   - Personal dashboard
   - Today's tasks + upcoming
   - Time tracking widget
   - Profile + skills
2. **Task Assignment**
   - Admin creates task → assigns to team member
   - Filter team by skill (designer, video editor, copywriter)
   - Bulk assign for content calendar items
3. **Task Workflow**
   - Team member: takes task → "in-progress"
   - Uploads deliverable → "review"
   - Admin approves → "done" or "needs revision"
4. **Time Tracking**
   - Simple Start/Stop timer
   - Manual entry option
   - Weekly hours summary
5. **Team Performance**
   - Tasks completed
   - On-time rate
   - Total hours

### ⏱️ Timeline
- Week 6: Team Portal + Profiles + Task creation
- Week 7: Time tracking + Performance metrics

---

## 🟣 PHASE 6 — Business Operations (Weeks 8-9)

### 🎯 Goal
عقود قانونية + مدفوعات + invoices.

### 🆕 New Tables
```sql
contracts (
  id, client_id, type, content (rich text),
  total_value, currency, status,
  signed_by_admin_at, signed_by_client_at,
  signature_admin (image/svg), signature_client,
  pdf_url, expires_at
)

invoices (
  id, client_id, contract_id, invoice_number,
  amount, currency, due_date, status (pending/paid/overdue),
  payment_method, paid_at, payment_proof
)

subscriptions (
  id, client_id, plan_name, monthly_amount,
  status, started_at, next_billing_date
)
```

### 📝 Features
1. **Contracts Module**
   - Templates library (retainer, project-based, one-time)
   - Custom edit before sending
   - E-signature (canvas-based, captures IP + timestamp)
   - PDF generation + storage on Hostinger
   - Email delivery to client
2. **Invoicing**
   - Auto-generated from contracts
   - Manual invoice creation
   - Payment status tracking
   - Email reminders for overdue
3. **Payments Integration** (choose one)
   - **Paymob** (best for Egypt) — Visa/Vodafone Cash/InstaPay
   - **Stripe** (best for international clients)
   - **Manual confirmation** (you mark as paid)

### ⏱️ Timeline
- Week 8: Contracts + E-signature
- Week 9: Invoicing + Payments

---

## 🟣 PHASE 7 — Platform API Integrations (Weeks 10-12)

> **⚠️ Depends on platform approvals** which take 2-4 weeks each.
> Started applications in Phase 0 — should be approved by now.

### 🎯 Goal
Auto-sync data from Meta, Google, TikTok ad platforms.

### 📝 Features
1. **Meta Marketing API**
   - OAuth flow: client connects their Meta Business account
   - Read-only access to campaigns, ad sets, ads, insights
   - Daily sync via Supabase Edge Function (cron)
   - Replace manual `client_metrics` entries
2. **Google Ads API**
   - Same flow with Google OAuth
   - Sync search/display/YouTube campaigns
3. **TikTok Marketing API**
   - Business account connection
   - Sync ad performance
4. **Unified Performance View**
   - All platforms in one chart
   - Cost per conversion across platforms
   - Top performing creatives

### 🛠️ Tech
- Supabase Edge Functions (Deno-based)
- Cron jobs for daily sync
- Tokens stored encrypted in Supabase

### ⏱️ Timeline
- Week 10: Meta API
- Week 11: Google Ads API
- Week 12: TikTok + Unified View

---

## 🟣 PHASE 8 — Automation & Polish (Weeks 13-15)

### 📝 Features
1. **N8N Automation Workflows**
   - Workflow templates (lead → CRM, content → schedule, etc.)
   - Triggered via Claude Code MCP
   - Per-client customization
2. **Advanced Reporting**
   - Monthly PDF reports auto-generated on the 1st
   - Email to client automatically
   - Comparison: Strategy goals vs actual results
3. **Notifications System**
   - In-app bell with unread count
   - Email digests (daily/weekly)
   - WhatsApp via Wati API (optional)
4. **Search**
   - Global search across clients, briefs, tasks, files
   - Filters per type
5. **Audit Log**
   - Every action logged (who/what/when)
   - Filter by user/client/date

### ⏱️ Timeline
- Week 13: Reports + Notifications
- Week 14: N8N integration
- Week 15: Search + Audit + Polish

---

## 🟣 PHASE 9 — Launch (Week 16)

### 📝 Tasks
- [ ] Privacy Policy + Terms of Service
- [ ] GDPR compliance check
- [ ] SEO meta tags everywhere
- [ ] Performance audit (Lighthouse 90+)
- [ ] Mobile responsiveness final check
- [ ] Onboard 2-3 pilot clients
- [ ] Marketing campaign on social
- [ ] LinkedIn launch post for Athar.

---

# 🔄 Execution Strategy

## Parallel Tracks

### Track 1 — Building (Claude Code, every day)
- Build features sequentially per phase
- Push to GitHub → auto-deploy to Hostinger
- Test on production
- Document changes

### Track 2 — Adham (parallel work)
- **Week 1:** Buy Hostinger, send domain
- **Week 1:** Apply for Meta Developer App
- **Week 1:** Apply for Google Ads Developer Token
- **Week 1:** Apply for TikTok Business
- **Week 2-4:** Start outreach to first clients
- **Week 2-4:** Create content for Athar's social media
- **Week 5+:** Onboard pilot clients on the platform

### Track 3 — Approvals (passive waiting)
- Meta App Review: 2-4 weeks
- Google Ads Token: 1-2 weeks
- TikTok Business: 1-2 weeks
- These run in background while we build

---

# 📋 Pre-Migration Checklist (Today)

## Adham's Checklist
- [ ] Decide final domain name
- [ ] Decide list of email addresses needed
- [ ] Visa/Mastercard ready
- [ ] Backup access to GitHub (2FA codes saved)
- [ ] Backup access to Supabase (password saved)

## Claude Code's Checklist (Done ✅)
- [x] All MVP features working
- [x] Brand identity finalized (Athar.)
- [x] Logo files generated
- [x] Database schema documented (database-backup.sql)
- [x] Migration guide written (MIGRATION-GUIDE.md)
- [x] Project summary PDF (project-summary.html)
- [x] AI-CONTEXT.md ready for future sessions

---

# 💰 Total Cost Breakdown

## Year 1
| Item | Annual Cost |
|---|---|
| Hostinger Cloud Startup (48 mo plan) | $120/year (avg) |
| Domain (athar.agency) | $0 (1st year free) |
| Business Emails | included |
| Supabase Free → Pro Q3 | $0-150 (year 1) |
| Web3Forms Free | $0 |
| **Total Year 1** | **~$120-270** |

## Year 2+
| Item | Annual Cost |
|---|---|
| Hostinger | $120/year |
| Domain renewal | $15/year |
| Supabase Pro | $300/year |
| Email (if expanding) | $20/year |
| Optional: Resend (transactional emails) | $0-240/year |
| **Total** | **~$455-695/year** |

**For an agency that bills $5,000-50,000/year per client, this is rounding error.**

---

# 🎯 Success Metrics (after Phase 9)

## Operational
- ✅ 5+ paying clients onboarded through the platform
- ✅ 3+ team members using the team portal
- ✅ All client communication on the platform (less email/WhatsApp chaos)
- ✅ Monthly reports auto-delivered

## Technical
- ✅ Lighthouse score 90+ on all pages
- ✅ Page load < 2 seconds
- ✅ Zero data leaks (RLS verified)
- ✅ Daily backups confirmed
- ✅ 99.9% uptime

## Business
- ✅ MRR (Monthly Recurring Revenue) of $5,000+ from retainers
- ✅ Pipeline of 10+ leads in admin dashboard
- ✅ NPS (client satisfaction) > 8/10

---

# 🚀 Today's Action Items

## For Adham (in next 24 hours)
1. ✅ Review this plan
2. 🛒 Buy Hostinger Cloud Startup (48 months)
3. 🌐 Register `athar.agency` (or chosen domain)
4. 📧 Activate Business Email
5. 📨 Send me: domain name + confirmation
6. 📝 Apply for Meta Developer App: https://developers.facebook.com
7. 📝 Apply for Google Ads Developer Token: https://developers.google.com/google-ads/api

## For Claude Code (after domain received)
1. Connect Hostinger Git ↔ GitHub
2. Set up DNS records
3. Update Supabase Site URL
4. Update Web3Forms email
5. Test end-to-end on new domain
6. Start Phase 3 development

---

# 📌 Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-06 | Brand: Athar. (أثر) | Strong meaning, MENA-rooted, scalable |
| 2026-05-06 | Stack: Hostinger + Supabase + GitHub | Best-of-breed, cost-effective, scalable |
| 2026-05-06 | Migration first, build second | Get production domain ASAP |
| 2026-05-06 | Manual data entry first, API later | Approvals take weeks, can't block on them |

---

**Last Updated:** May 6, 2026
**Next Review:** Weekly during build, monthly after launch
