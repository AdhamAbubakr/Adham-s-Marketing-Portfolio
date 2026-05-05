// ============================================================
// Adham. Portfolio — Tracking Pixel Loader
// Reads pixel IDs from Supabase `site_settings` table and injects
// the corresponding tracking scripts into the page.
// ============================================================

(async function loadTrackingPixels(){
  if(!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;

  // Use REST API directly (faster than full client init for one-shot read)
  let settings = {};
  try {
    const res = await fetch(`${window.SUPABASE_URL}/rest/v1/site_settings?select=key,value`, {
      headers: {
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
      }
    });
    if(!res.ok) return;
    const rows = await res.json();
    rows.forEach(r => { settings[r.key] = (r.value || '').trim(); });
  } catch(e){ console.warn('[Tracking] Could not load settings:', e); return; }

  // ---- 1. Meta Pixel ----
  if(settings.meta_pixel_id){
    const id = settings.meta_pixel_id;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', id);
    fbq('track', 'PageView');
    // noscript fallback
    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1" alt=""/>`;
    document.body.appendChild(noscript);
    console.log('[Tracking] Meta Pixel loaded:', id);
  }

  // ---- 2. Google Analytics 4 ----
  if(settings.ga4_id){
    const id = settings.ga4_id;
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', id);
    console.log('[Tracking] GA4 loaded:', id);
  }

  // ---- 3. Google Tag Manager ----
  if(settings.gtm_id){
    const id = settings.gtm_id;
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',id);
    // noscript
    const ns = document.createElement('noscript');
    ns.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.insertBefore(ns, document.body.firstChild);
    console.log('[Tracking] GTM loaded:', id);
  }

  // ---- 4. TikTok Pixel ----
  if(settings.tiktok_pixel_id){
    const id = settings.tiktok_pixel_id;
    !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=r+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load(id);ttq.page();}(window,document,'ttq');
    console.log('[Tracking] TikTok Pixel loaded:', id);
  }

  // ---- 5. Snapchat Pixel ----
  if(settings.snapchat_pixel_id){
    const id = settings.snapchat_pixel_id;
    (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');
    snaptr('init', id);
    snaptr('track', 'PAGE_VIEW');
    console.log('[Tracking] Snapchat Pixel loaded:', id);
  }

  // ---- 6. LinkedIn Insight Tag ----
  if(settings.linkedin_partner_id){
    const id = settings.linkedin_partner_id;
    window._linkedin_partner_id = id;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(id);
    (function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");b.type="text/javascript";b.async=true;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s);})(window.lintrk);
    console.log('[Tracking] LinkedIn Insight Tag loaded:', id);
  }

  // ---- 7. Custom HEAD code (anything else) ----
  if(settings.custom_head_code){
    try {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = settings.custom_head_code;
      // Move <script> tags to actually execute
      wrapper.querySelectorAll('script').forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(a => newScript.setAttribute(a.name, a.value));
        newScript.appendChild(document.createTextNode(oldScript.textContent));
        document.head.appendChild(newScript);
      });
      // Move non-script nodes (meta, link, etc.)
      Array.from(wrapper.children).forEach(node => {
        if(node.tagName !== 'SCRIPT') document.head.appendChild(node);
      });
      console.log('[Tracking] Custom head code injected');
    } catch(e){ console.warn('[Tracking] Custom code injection failed:', e); }
  }
})();
