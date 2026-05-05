# AI Context Brief — Adham's Portfolio

> **How to use:** Paste this entire file into any new AI chat (Claude, ChatGPT, Gemini, etc.) before asking for edits. It gives the AI everything it needs to continue the work.

---

## Project
Personal portfolio website for **Adham Abo Bakr SalahElden** — Digital Marketing Specialist (Egypt). Built to apply for remote marketing jobs across MENA & Africa.

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

## Site Sections (in order)
1. Animated intro loader (1.9s, AA monogram)
2. Sticky nav (Impact, About, Services, Case Studies, Skills, Resume, Process, Hire Me)
3. Hero (gradient title, badge, 4 stat counters, animated floating cards)
4. **Impact** — 8 aggregate counter cards (10M+ reach, 25K+ conversions, 8.4× ROAS, etc.)
5. About (monogram + bio)
6. Services (6 cards inc. WordPress + Shopify e-commerce)
7. **Case Studies** — combined-numbers approach: 1 hero stat + 6 counter cards + 12-brand logo strip
8. Skills (animated bars + tool pills)
9. **Resume** — vertical timeline (8 jobs from CV) + education + Download CV button
10. Process (5 steps)
11. Contact (email, phone, WhatsApp)
12. Footer

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
