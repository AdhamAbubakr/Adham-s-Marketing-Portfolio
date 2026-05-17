-- =============================================================================
-- Barkar OS — Knowledge Base / Playbooks (Phase 4)
-- =============================================================================
-- Default playbook per role (original Barkar content) + personal/workspace uploads.
-- Run AFTER ai-tools-schema.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug             text UNIQUE,                 -- set for default playbooks (idempotent seed)
  role             text NOT NULL,               -- role key, or 'all'
  title            text NOT NULL,
  content          text,                        -- in-app readable playbook (lightweight markdown)
  file_url         text,                        -- for uploaded references
  file_name        text,
  type             text DEFAULT 'personal' CHECK (type IN ('default','workspace','personal')),
  uploaded_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_name text,
  sort_order       int DEFAULT 100,
  created_at       timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS kb_role_idx ON public.knowledge_base(role, type);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Admin manages everything
DROP POLICY IF EXISTS "Admin manages KB" ON public.knowledge_base;
CREATE POLICY "Admin manages KB" ON public.knowledge_base FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Everyone authenticated can read default + workspace docs
DROP POLICY IF EXISTS "Read default and workspace KB" ON public.knowledge_base;
CREATE POLICY "Read default and workspace KB" ON public.knowledge_base FOR SELECT TO authenticated
  USING (type IN ('default','workspace'));

-- Users read their own personal docs
DROP POLICY IF EXISTS "Read own personal KB" ON public.knowledge_base;
CREATE POLICY "Read own personal KB" ON public.knowledge_base FOR SELECT TO authenticated
  USING (type = 'personal' AND uploaded_by = auth.uid());

-- Users upload their own personal docs
DROP POLICY IF EXISTS "Insert own personal KB" ON public.knowledge_base;
CREATE POLICY "Insert own personal KB" ON public.knowledge_base FOR INSERT TO authenticated
  WITH CHECK (type = 'personal' AND uploaded_by = auth.uid());

-- Users delete their own personal docs
DROP POLICY IF EXISTS "Delete own personal KB" ON public.knowledge_base;
CREATE POLICY "Delete own personal KB" ON public.knowledge_base FOR DELETE TO authenticated
  USING (type = 'personal' AND uploaded_by = auth.uid());

-- Storage bucket for KB uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge', 'knowledge', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "KB upload own folder" ON storage.objects;
CREATE POLICY "KB upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'knowledge' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

DROP POLICY IF EXISTS "KB read authenticated" ON storage.objects;
CREATE POLICY "KB read authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'knowledge');

DROP POLICY IF EXISTS "KB read anon" ON storage.objects;
CREATE POLICY "KB read anon" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'knowledge');

DROP POLICY IF EXISTS "KB delete own" ON storage.objects;
CREATE POLICY "KB delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'knowledge' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

-- =============================================================================
-- SEED — Default Barkar Playbooks (original content, idempotent via slug)
-- =============================================================================
INSERT INTO public.knowledge_base (slug, role, title, type, sort_order, content) VALUES

('playbook-strategist','strategist','📘 Strategist Playbook','default',1,
'🎯 MISSION
Turn a client brief into a clear, data-backed marketing strategy the whole team can execute.

📥 YOU RECEIVE: Client brief, goals, budget, brand assets (from Account Manager).
📤 YOU HAND OFF: The Marketing Strategy → Account Manager.

🧭 HOW TO BUILD A STRATEGY
1. Diagnose: business model, margins, current channels, what is working.
2. Audience: who buys, why, where they spend attention, objections.
3. Positioning: one sentence — why us, not them.
4. Channel mix: pick 2-3 channels you can win on, not all of them.
5. Funnel: define the TOFU/MOFU/BOFU message for each stage.
6. KPIs: pick ONE primary metric per stage; everything else is secondary.
7. 90-day plan: phase it — test, learn, scale.

📊 READING YOUR DASHBOARD
Watch the Cycle Health view: if a client is stuck at one stage, the strategy may be unclear. Revisit the brief.

⚡ KEY DECISIONS
- Narrow beats broad. One sharp audience > five vague ones.
- If you cannot measure it, do not promise it.
- Re-strategize every cycle using the Reporting handoff.

✅ USING YOUR PORTAL
Check Inbox for new briefs → build strategy → attach it → Hand off to Account Manager.'),

('playbook-account_manager','account_manager','📘 Account Manager Playbook','default',2,
'🎯 MISSION
Be the bridge between the client and the team. Translate strategy into clear briefs and keep the cycle moving.

📥 YOU RECEIVE: Strategy (from Strategist) + client communication.
📤 YOU HAND OFF: Briefs/tasks → Copywriter & Creative. Reports → Strategist (loop).

🧭 HOW TO RUN AN ACCOUNT
1. Translate strategy into specific, dated deliverables.
2. Write briefs the team can act on without asking you twice.
3. Set expectations with the client BEFORE work starts, not after.
4. Protect the team from scope creep — every new ask is a new brief.
5. Chase blocked handoffs daily.

📊 READING YOUR DASHBOARD
Cycle Health is your morning coffee. Red dots = a project stuck. Find the blocked handoff, unblock it, or escalate to admin.

⚡ KEY DECISIONS
- Silence is risk. No client update for a week = problem coming.
- A vague brief wastes the whole downstream cycle. Be specific.
- If priorities clash, the strategy KPI wins.

✅ USING YOUR PORTAL
Inbox = strategies ready to brief. Create handoffs to the next roles with clear notes + due dates. Watch the Workflow board.'),

('playbook-copywriter','copywriter','📘 Copywriter Playbook','default',3,
'🎯 MISSION
Write words that move people to act — hooks, ad copy, scripts, landing copy.

📥 YOU RECEIVE: Brief + strategy (audience, offer, tone).
📤 YOU HAND OFF: Copy/scripts/hooks → Content Creator.

🧭 FRAMEWORKS THAT WORK
- Hook first: the first line decides if the rest is read.
- PAS: Problem → Agitate → Solution.
- AIDA: Attention → Interest → Desire → Action.
- One idea per asset. Confused readers do not buy.
- Write to ONE person, not a crowd.

📊 READING YOUR DASHBOARD
Look at which copy angles the Media Buyer reports as winners. Double down on the angle, not just the wording.

⚡ KEY DECISIONS
- Clarity beats clever. If they re-read to understand, rewrite.
- Match the awareness stage: cold traffic needs a different message than retargeting.
- Always give 3+ hook variations for testing.

✅ USING YOUR PORTAL
Inbox = briefs to write. Deliver copy as a handoff with the angle explained so the next role keeps intent.'),

('playbook-content_creator','content_creator','📘 Content Creator Playbook','default',4,
'🎯 MISSION
Turn strategy + copy into a content calendar the creative team can produce.

📥 YOU RECEIVE: Copy/hooks (Copywriter) + strategy pillars.
📤 YOU HAND OFF: Content calendar → Creative (Designer/Video/Photo).

🧭 HOW TO PLAN CONTENT
1. Pillars: 3-5 themes the brand owns. Every post maps to one.
2. Formats: match format to platform (reels, carousels, stories).
3. Cadence: consistency beats volume. Plan a realistic week.
4. Hook + value + CTA on every piece.
5. Repurpose: one big idea → many small assets.

📊 READING YOUR DASHBOARD
Track which pillars/formats the Social Specialist reports as best engagement. Shift the calendar toward winners.

⚡ KEY DECISIONS
- 80% value / 20% promotion is a healthy mix for organic.
- A great idea late beats a weak idea on time — but communicate the delay.
- Batch similar content to keep production efficient.

✅ USING YOUR PORTAL
Inbox = approved copy. Build the calendar, hand off to the creative roles with clear specs (format, dimensions, deadline).'),

('playbook-designer','designer','📘 Graphic Designer Playbook','default',5,
'🎯 MISSION
Create scroll-stopping visuals that carry the message and the brand.

📥 YOU RECEIVE: Content calendar + copy + brand guidelines.
📤 YOU HAND OFF: Final assets → Social Media Specialist (organic) / Media Buyer (paid).

🧭 PRINCIPLES
- The visual must work in 1 second on mute.
- Contrast + hierarchy: the eye should know where to look first.
- Brand consistency: same colors, type, logo treatment everywhere.
- Design for the platform spec, not the desktop preview.
- Export the right sizes (1:1, 4:5, 9:16) — never crop blindly.

📊 READING YOUR DASHBOARD
Ask the Media Buyer which creatives have the best hook rate / CTR. Reverse-engineer why they worked.

⚡ KEY DECISIONS
- Clean and clear beats busy and clever.
- If the text is unreadable on a phone, it failed.
- Always deliver editable source files.

✅ USING YOUR PORTAL
Inbox = calendar items to design. Use the AI Toolkit (Midjourney/Firefly/Canva) for speed. Hand off labeled assets.'),

('playbook-video_editor','video_editor','📘 Video Editor Playbook','default',6,
'🎯 MISSION
Cut video that holds attention from second one to the CTA.

📥 YOU RECEIVE: Calendar + scripts + raw footage.
📤 YOU HAND OFF: Final cuts → Social Media Specialist / Media Buyer.

🧭 PRINCIPLES
- The first 3 seconds are everything — strong hook or they scroll.
- Pace: cut on motion, remove dead air, keep it moving.
- Captions always (most watch on mute).
- Aspect ratios per placement: 9:16 reels, 1:1 feed, 16:9 YouTube.
- One message per video.

📊 READING YOUR DASHBOARD
Hook rate (3-sec view %) and hold/retention tell you where viewers drop. Re-cut the drop point.

⚡ KEY DECISIONS
- If retention dies at 3s, the hook is the problem — not the ending.
- Shorter usually wins for paid; tell the full story only if it earns the time.
- Deliver multiple hook variants for testing.

✅ USING YOUR PORTAL
Inbox = scripts/footage. Use the AI Toolkit (CapCut/OpusClip/Descript). Hand off with versions labeled by hook.'),

('playbook-photographer','photographer','📘 Photographer Playbook','default',7,
'🎯 MISSION
Capture product/brand imagery that sells and stays on-brand.

📥 YOU RECEIVE: Shot list + brand guidelines + products.
📤 YOU HAND OFF: Edited photos → Designer / Social / Media Buyer.

🧭 PRINCIPLES
- Plan the shot list from the content calendar — shoot with purpose.
- Lighting first: it makes or breaks the image.
- Capture variations: hero, lifestyle, detail, negative-space (for text).
- Shoot for the crop you will actually use.
- Consistent editing style = recognizable brand.

📊 READING YOUR DASHBOARD
See which image styles the Social/Media Buyer report as best performers; lean into them next shoot.

⚡ KEY DECISIONS
- A clean simple shot beats an over-edited one.
- Always deliver web-optimized + high-res originals.
- Negative space images are gold for ad overlays — always shoot some.

✅ USING YOUR PORTAL
Inbox = shot lists. Use the AI Toolkit (Lightroom/Topaz/remove.bg) for batch editing. Hand off organized galleries.'),

('playbook-social_media_specialist','social_media_specialist','📘 Social Media Specialist Playbook','default',8,
'🎯 MISSION
Publish, grow, and engage the organic community across platforms.

📥 YOU RECEIVE: Approved assets + calendar.
📤 YOU HAND OFF: Published content + engagement insights → Media Buyer (best organic = best ad).

🧭 PRINCIPLES
- Consistency beats bursts. A steady calendar wins the algorithm.
- Hook in the caption first line too, not just the visual.
- Engage in the first 30-60 min after posting — it signals the algorithm.
- Community management is content: replies are public.
- Watch saves/shares more than likes — they signal real value.

📊 READING YOUR DASHBOARD
Top organic posts = proven creative. Flag them to the Media Buyer to scale with paid.

⚡ KEY DECISIONS
- Post when YOUR audience is active, not generic best times.
- Kill formats that consistently underperform after a fair test.
- Trends only if they fit the brand — forced trends age badly.

✅ USING YOUR PORTAL
Inbox = approved assets. Schedule via the AI Toolkit (Vista Social/Buffer/Metricool). Hand winning organic to Media Buyer.'),

('playbook-web_developer','web_developer','📘 Web Developer Playbook','default',9,
'🎯 MISSION
Build fast, tracked landing pages and sites that convert.

📥 YOU RECEIVE: Strategy + copy + assets + funnel plan.
📤 YOU HAND OFF: Live landing pages/site → Media Buyer.

🧭 PRINCIPLES
- Speed is conversion: every second of load time costs sales.
- One page, one goal, one primary CTA above the fold.
- Tracking before traffic: pixels, events, conversions must fire correctly.
- Mobile-first: most paid traffic is mobile.
- Make it easy to A/B test sections.

📊 READING YOUR DASHBOARD
If the Media Buyer reports good CTR but poor conversions, the page (not the ad) is usually the bottleneck.

⚡ KEY DECISIONS
- Never launch a campaign page without verified tracking.
- Reduce form fields — every field drops conversion.
- Fix the funnel leak before scaling spend.

✅ USING YOUR PORTAL
Inbox = page requests. Use the AI Toolkit (Cursor/Copilot/v0). Hand off the live URL + confirmed tracking to Media Buyer.'),

('playbook-shopify_designer','shopify_designer','📘 Shopify Designer Playbook','default',10,
'🎯 MISSION
Build a Shopify store that turns visitors into buyers.

📥 YOU RECEIVE: Brand + products + strategy.
📤 YOU HAND OFF: Live store / product pages → Media Buyer.

🧭 PRINCIPLES
- Product page is the money page: images, benefits, proof, clear CTA.
- Trust elements: reviews, guarantees, shipping clarity, secure checkout.
- Speed + mobile: optimize theme, compress images.
- Reduce checkout friction: fewer steps, more payment options.
- Upsell/cross-sell where it helps the customer, not annoys them.

📊 READING YOUR DASHBOARD
Watch add-to-cart vs checkout vs purchase. The biggest drop is your biggest opportunity.

⚡ KEY DECISIONS
- Clarity over decoration on product pages.
- Test one change at a time so you know what worked.
- Mobile checkout must be flawless before driving paid traffic.

✅ USING YOUR PORTAL
Inbox = store tasks. Use the AI Toolkit (Shopify Magic/PageFly/Instant). Hand off the live store URL to Media Buyer.'),

('playbook-wordpress_designer','wordpress_designer','📘 WordPress Designer Playbook','default',11,
'🎯 MISSION
Build WordPress/WooCommerce sites that are fast, clean, and convert.

📥 YOU RECEIVE: Brand + content + strategy.
📤 YOU HAND OFF: Live site/pages → Media Buyer / SEO.

🧭 PRINCIPLES
- Keep plugins minimal — each one is a speed/security risk.
- Caching + image optimization are non-negotiable.
- Build with a consistent design system (spacing, type, color).
- SEO-ready structure: clean URLs, headings, schema.
- Backups + updates: protect the site you built.

📊 READING YOUR DASHBOARD
Slow pages show up as poor conversion in the Media Buyer report and poor rankings for SEO. Speed is shared currency.

⚡ KEY DECISIONS
- A lean custom build beats a bloated template.
- Never skip a backup before a major change.
- Coordinate URL structure with the SEO Specialist early.

✅ USING YOUR PORTAL
Inbox = build tasks. Use the AI Toolkit (Elementor AI/10Web/CodeWP). Hand off the live URL to the next role.'),

('playbook-seo_specialist','seo_specialist','📘 SEO Specialist Playbook','default',12,
'🎯 MISSION
Grow durable organic visibility that compounds over time.

📥 YOU RECEIVE: Strategy + site/content.
📤 YOU HAND OFF: SEO improvements + content briefs → Reporting / Content.

🧭 PRINCIPLES
- Search intent first: match the page to what the searcher actually wants.
- Technical foundation: speed, crawlability, mobile, structured data.
- Content depth beats keyword stuffing.
- Internal links spread authority — use them deliberately.
- Backlinks are votes; quality over quantity.

📊 READING YOUR DASHBOARD
Track rankings + organic traffic + conversions, not vanity impressions. Rankings without conversions = wrong keywords.

⚡ KEY DECISIONS
- Fix technical issues before chasing new keywords.
- Target keywords you can realistically rank for now; stretch later.
- SEO is a 3-6 month game — set expectations with the Account Manager.

✅ USING YOUR PORTAL
Inbox = SEO tasks. Use the AI Toolkit (Semrush/Ahrefs/Surfer). Hand off content briefs to Content Creator.'),

('playbook-media_buyer','media_buyer','📘 Media Buyer Field Guide','default',13,
'🎯 MISSION
Turn creative + landing pages into profitable paid campaigns — highest ROAS, lowest CPA.

📥 YOU RECEIVE: Creative assets + landing pages + strategy (audience, budget, objective).
📤 YOU HAND OFF: Campaign results + next-cycle recommendations → Reporting.

🧭 THE SALES FUNNEL
- TOFU (Awareness): people who do not know the brand. Goal: reach/views. Metrics: CPM, ThruPlay, 3-sec hook rate.
- MOFU (Consideration): engaged/visited. Goal: traffic/leads. Metrics: CTR, CPC, cost per lead.
- BOFU (Conversion/Retargeting): close to buying. Goal: purchases. Metrics: CPA, ROAS, AOV.
Rule: never ask for a purchase from someone who does not know the brand yet.

📊 READING YOUR DASHBOARD
- CPM high → audience saturated or weak creative.
- CTR under ~1% → creative/offer not compelling.
- Hook Rate low → first 3 seconds are weak (video).
- CPA is the truth metric — it decides profit.
- ROAS = Revenue ÷ Spend; below breakeven = losing money.
- Frequency above ~3-4 in a short window = ad fatigue.

⚡ DECISION FRAMEWORK
- ROAS above target + stable 3 days → SCALE (raise budget ~20-30%/day max).
- CPA above 2x target after learning → KILL the ad/ad set.
- Winning ad → DUPLICATE into a new ad set to test audiences.
- Frequency > 4 + declining → REFRESH creative.
- Under 50 conversions (learning) → WAIT, do not touch.
- Good CTR but no conversions → the LANDING PAGE is the problem, not the ad.

🏷️ PER-BRAND
Read the strategy first (audience, budget, objective). E-com → optimize ROAS/AOV. Lead-gen → cost per qualified lead. New brand → start at TOFU before asking for sales. Document every decision in the handoff.

✅ USING YOUR PORTAL
Inbox = creative + landing ready? Connect ad accounts in Ad Accounts (or CSV import). Read KPIs vs targets. Decide using the framework. Log results → Hand off to Reporting.'),

('playbook-other','other','📘 Generalist Playbook','default',14,
'🎯 MISSION
Support whatever stage of the cycle needs you, with clarity and ownership.

📥 YOU RECEIVE: Tasks/handoffs assigned to you.
📤 YOU HAND OFF: Completed work → the next relevant role.

🧭 PRINCIPLES
- Understand where your task sits in the cycle before starting.
- Over-communicate: a quick update prevents a big problem.
- Document what you did so the next person can pick up fast.
- Ask for the why, not just the what — better output.

📊 READING YOUR DASHBOARD
Use the Workflow Inbox to see what is waiting on you and the priority/due date.

⚡ KEY DECISIONS
- If blocked, mark it blocked AND say why — do not go silent.
- If unsure who is next, hand off to the Account Manager.

✅ USING YOUR PORTAL
Inbox = your work. Use the AI Toolkit for speed. Hand off cleanly with notes.')

ON CONFLICT (slug) DO UPDATE SET
  title=EXCLUDED.title, content=EXCLUDED.content, role=EXCLUDED.role,
  type=EXCLUDED.type, sort_order=EXCLUDED.sort_order;
