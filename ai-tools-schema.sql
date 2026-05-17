-- =============================================================================
-- Barkar OS — AI Toolkit (Phase 3)
-- =============================================================================
-- Per-position AI tool launcher. Each tool maps to one or more role keys.
-- Run AFTER workflow-schema.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_tools (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  url         text NOT NULL,
  icon        text DEFAULT '🤖',          -- emoji (logo_url optional later)
  logo_url    text,
  category    text,
  description text,
  roles       text[] DEFAULT '{}',         -- role keys this tool serves
  sort_order  int DEFAULT 100,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_tools_roles_idx ON public.ai_tools USING gin(roles);

-- Per-user favorites / quick access
CREATE TABLE IF NOT EXISTS public.user_tool_links (
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_id        uuid REFERENCES public.ai_tools(id) ON DELETE CASCADE NOT NULL,
  is_favorite    boolean DEFAULT true,
  last_opened_at timestamptz,
  PRIMARY KEY (user_id, tool_id)
);

-- RLS
ALTER TABLE public.ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tool_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated reads tools" ON public.ai_tools;
CREATE POLICY "Anyone authenticated reads tools" ON public.ai_tools
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Admin manages tools" ON public.ai_tools;
CREATE POLICY "Admin manages tools" ON public.ai_tools
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "User manages own tool links" ON public.user_tool_links;
CREATE POLICY "User manages own tool links" ON public.user_tool_links
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- SEED — real tools per marketing position (idempotent via slug)
-- =============================================================================
INSERT INTO public.ai_tools (slug, name, url, icon, category, description, roles, sort_order) VALUES
-- Universal
('chatgpt','ChatGPT','https://chat.openai.com','💬','Assistant','General AI assistant — research, copy, analysis','{strategist,account_manager,copywriter,content_creator,seo_specialist,media_buyer,other}',1),
('claude','Claude','https://claude.ai','🧠','Assistant','Long-form reasoning, analysis, writing','{strategist,account_manager,copywriter,content_creator,web_developer,other}',2),
('perplexity','Perplexity','https://www.perplexity.ai','🔎','Research','AI search with sources — fast market research','{strategist,account_manager,seo_specialist,other}',3),
('notion-ai','Notion AI','https://www.notion.so/product/ai','📔','Productivity','Docs, notes, summaries inside Notion','{account_manager,content_creator,strategist,other}',4),

-- Strategist
('sparktoro','SparkToro','https://sparktoro.com','📡','Audience','Audience intelligence — where they hang out','{strategist}',10),
('answerthepublic','AnswerThePublic','https://answerthepublic.com','❓','Research','What people search around a topic','{strategist,seo_specialist,content_creator}',11),
('crayon','Crayon','https://www.crayon.co','🦎','Competitive','Competitive intelligence tracking','{strategist}',12),

-- Account Manager
('fireflies','Fireflies.ai','https://fireflies.ai','🔥','Meetings','AI meeting notes & action items','{account_manager}',20),
('fathom','Fathom','https://fathom.video','🎥','Meetings','Free AI meeting recorder & summary','{account_manager}',21),
('clickup-ai','ClickUp AI','https://clickup.com/ai','✅','PM','AI inside project management','{account_manager}',22),

-- Copywriter
('jasper','Jasper','https://www.jasper.ai','🟪','Copy','Marketing copy at scale','{copywriter,content_creator}',30),
('copyai','Copy.ai','https://www.copy.ai','✏️','Copy','Ad copy, emails, scripts','{copywriter}',31),
('grammarly','Grammarly','https://www.grammarly.com','🟢','Editing','Grammar, tone, clarity','{copywriter,content_creator,account_manager}',32),
('hemingway','Hemingway Editor','https://hemingwayapp.com','📕','Editing','Tighten & simplify writing','{copywriter}',33),
('writesonic','Writesonic','https://writesonic.com','🦅','Copy','SEO copy & articles','{copywriter,seo_specialist}',34),

-- Content Creator
('lately','Lately AI','https://www.lately.ai','🔁','Repurpose','Turn long content into social posts','{content_creator,social_media_specialist}',40),
('taplio','Taplio','https://taplio.com','🔷','Social','LinkedIn content engine','{content_creator,social_media_specialist}',41),

-- Graphic Designer
('midjourney','Midjourney','https://www.midjourney.com','🖼️','Image Gen','High-end AI image generation','{designer,photographer}',50),
('adobe-firefly','Adobe Firefly','https://www.adobe.com/products/firefly.html','🔥','Image Gen','Commercial-safe generative imaging','{designer,photographer}',51),
('canva','Canva Magic Studio','https://www.canva.com/magic','🎨','Design','Templates + AI design tools','{designer,content_creator,social_media_specialist}',52),
('leonardo','Leonardo.ai','https://leonardo.ai','🗡️','Image Gen','Game/ad-grade AI art','{designer}',53),
('recraft','Recraft','https://www.recraft.ai','✒️','Vector','AI vectors, icons, brand sets','{designer}',54),
('looka','Looka','https://looka.com','🅻','Branding','AI logo & brand kit','{designer}',55),
('khroma','Khroma','https://www.khroma.co','🌈','Color','AI color palette generator','{designer}',56),

-- Video Editor
('runway','Runway','https://runwayml.com','🎞️','Video Gen','AI video generation & editing','{video_editor}',60),
('capcut','CapCut','https://www.capcut.com','✂️','Editing','Fast social video editing','{video_editor,content_creator}',61),
('descript','Descript','https://www.descript.com','🎙️','Editing','Edit video by editing text','{video_editor}',62),
('opusclip','OpusClip','https://www.opus.pro','🔪','Repurpose','Long video → viral shorts','{video_editor,social_media_specialist}',63),
('veed','VEED','https://www.veed.io','🟣','Editing','Online video editor + subtitles','{video_editor}',64),
('heygen','HeyGen','https://www.heygen.com','🧑‍💼','Avatar','AI avatars & video translation','{video_editor}',65),
('pika','Pika','https://pika.art','✨','Video Gen','Text-to-video generation','{video_editor}',66),

-- Photographer
('lightroom','Adobe Lightroom','https://www.adobe.com/products/photoshop-lightroom.html','📷','Editing','AI photo editing & presets','{photographer}',70),
('topaz-photo','Topaz Photo AI','https://www.topazlabs.com/topaz-photo-ai','🦅','Enhance','AI upscale & denoise','{photographer}',71),
('luminar','Luminar Neo','https://skylum.com/luminar','🌅','Editing','AI-powered photo editor','{photographer}',72),
('removebg','remove.bg','https://www.remove.bg','🪄','Utility','Instant background removal','{photographer,designer}',73),
('magnific','Magnific AI','https://magnific.ai','🔬','Upscale','Extreme AI upscaler','{photographer,designer}',74),

-- Social Media Specialist
('vista-social','Vista Social','https://vistasocial.com','📲','Scheduling','Publish, schedule, analytics','{social_media_specialist,content_creator}',80),
('buffer','Buffer','https://buffer.com','📊','Scheduling','Simple social scheduling + AI','{social_media_specialist}',81),
('metricool','Metricool','https://metricool.com','📈','Analytics','Cross-platform analytics & planning','{social_media_specialist,media_buyer}',82),
('predis','Predis.ai','https://predis.ai','🎯','Content','AI social post generator','{social_media_specialist}',83),
('ocoya','Ocoya','https://www.ocoya.com','🐙','Content','AI content + scheduling','{social_media_specialist}',84),

-- SEO Specialist
('semrush','Semrush','https://www.semrush.com','🟧','SEO','Keyword, competitor, audit suite','{seo_specialist}',90),
('ahrefs','Ahrefs','https://ahrefs.com','🔵','SEO','Backlinks & keyword research','{seo_specialist}',91),
('surfer','Surfer SEO','https://surferseo.com','🏄','SEO','Content optimization by SERP','{seo_specialist,copywriter}',92),
('frase','Frase','https://www.frase.io','📝','SEO','SEO content briefs & writing','{seo_specialist,content_creator}',93),
('clearscope','Clearscope','https://www.clearscope.io','🔭','SEO','Content grading vs competitors','{seo_specialist}',94),
('screaming-frog','Screaming Frog','https://www.screamingfrog.co.uk/seo-spider','🐸','Technical','Technical site crawler','{seo_specialist,web_developer}',95),

-- Web Developer
('github-copilot','GitHub Copilot','https://github.com/features/copilot','🐙','Coding','AI pair programmer','{web_developer}',100),
('cursor','Cursor','https://cursor.com','🖱️','Coding','AI-first code editor','{web_developer}',101),
('v0','v0 by Vercel','https://v0.dev','▲','UI Gen','AI UI from a prompt','{web_developer}',102),
('lovable','Lovable','https://lovable.dev','💗','App Gen','Full app from prompt','{web_developer}',103),
('bolt','Bolt.new','https://bolt.new','⚡','App Gen','In-browser AI full-stack builder','{web_developer}',104),

-- Shopify Designer
('shopify-magic','Shopify Magic','https://www.shopify.com/magic','🛍️','E-com','AI inside Shopify admin','{shopify_designer}',110),
('pagefly','PageFly','https://pagefly.io','📄','Builder','Shopify page builder','{shopify_designer}',111),
('instant','Instant','https://instant.so','⚡','Builder','Visual Shopify section builder','{shopify_designer}',112),
('gempages','GemPages','https://gempages.net','💎','Builder','Shopify landing builder','{shopify_designer}',113),

-- WordPress Designer
('elementor-ai','Elementor AI','https://elementor.com/ai','🟥','Builder','AI inside Elementor','{wordpress_designer}',120),
('divi-ai','Divi AI','https://www.elegantthemes.com/documentation/divi/divi-ai','🟪','Builder','AI for Divi theme','{wordpress_designer}',121),
('10web','10Web','https://10web.io','🕸️','Builder','AI WordPress site builder','{wordpress_designer}',122),
('codewp','CodeWP','https://codewp.ai','⌨️','Coding','AI code for WordPress','{wordpress_designer,web_developer}',123),

-- Media Buyer
('meta-ads','Meta Ads Manager','https://www.facebook.com/adsmanager','🟦','Ads','Facebook & Instagram campaigns','{media_buyer}',130),
('google-ads','Google Ads','https://ads.google.com','🔵','Ads','Search, Display, YouTube, PMax','{media_buyer}',131),
('tiktok-ads','TikTok Ads Manager','https://ads.tiktok.com','⚫','Ads','TikTok campaign manager','{media_buyer}',132),
('madgicx','Madgicx','https://madgicx.com','🪄','Optimization','AI ad optimization for Meta','{media_buyer}',133),
('revealbot','Revealbot','https://revealbot.com','🤖','Automation','Auto scale/kill rules','{media_buyer}',134),
('adcreative','AdCreative.ai','https://www.adcreative.ai','🎨','Creative','AI ad creatives + scoring','{media_buyer,designer}',135),
('motion','Motion','https://motionapp.com','📐','Analytics','Creative analytics for ads','{media_buyer}',136),
('triple-whale','Triple Whale','https://www.triplewhale.com','🐳','Attribution','E-com profit & attribution','{media_buyer}',137)
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name, url=EXCLUDED.url, icon=EXCLUDED.icon,
  category=EXCLUDED.category, description=EXCLUDED.description,
  roles=EXCLUDED.roles, sort_order=EXCLUDED.sort_order, is_active=true;
