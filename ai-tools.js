/* =============================================================================
   Barkar OS — AI Toolkit Module (Phase 3)
   Renders the AI tools relevant to a team member's role.
   Click a tool → opens it in a new tab. Favorites stored per user.
   ========================================================================== */

(function(){
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

  let stylesInjected=false;
  function injectStyles(){
    if(stylesInjected) return; stylesInjected=true;
    const css=`
      .ait-bar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.6rem;margin-bottom:.9rem}
      .ait-bar .ait-sub{font-size:.82rem;color:var(--muted,#9090A8)}
      .ait-filter{display:flex;gap:.4rem;flex-wrap:wrap}
      .ait-chip{background:var(--bg2,#11062A);border:1px solid var(--border,rgba(168,85,247,.18));color:var(--muted);font-size:.74rem;font-weight:600;padding:.3rem .7rem;border-radius:50px;cursor:pointer;transition:all .2s}
      .ait-chip.active,.ait-chip:hover{background:rgba(124,58,237,.18);border-color:var(--purple-light,#A855F7);color:var(--purple-light)}
      .ait-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.7rem}
      .ait-card{position:relative;background:var(--card,#1C1130);border:1px solid var(--border);border-radius:12px;padding:1rem .9rem;cursor:pointer;transition:all .2s;text-align:center;text-decoration:none;color:inherit;display:flex;flex-direction:column;align-items:center;gap:.45rem;min-height:118px;justify-content:center}
      .ait-card:hover{border-color:var(--purple-light,#A855F7);transform:translateY(-3px);box-shadow:0 10px 24px rgba(124,58,237,.18)}
      .ait-ico{font-size:1.9rem;line-height:1;width:46px;height:46px;display:flex;align-items:center;justify-content:center;background:var(--bg2,#11062A);border-radius:12px;border:1px solid var(--border)}
      .ait-name{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.86rem;color:var(--text,#F8F8FC);line-height:1.2}
      .ait-cat{font-size:.66rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
      .ait-fav{position:absolute;top:.45rem;right:.5rem;background:none;border:none;font-size:.95rem;cursor:pointer;opacity:.4;transition:opacity .2s;line-height:1;padding:.15rem}
      .ait-fav:hover{opacity:1}
      .ait-fav.on{opacity:1}
      .ait-empty{text-align:center;padding:2.2rem 1rem;color:var(--muted)}
      .ait-empty-ico{font-size:2.2rem;opacity:.5;margin-bottom:.5rem}
      .ait-tip{font-size:.74rem;color:var(--muted);margin-top:.8rem;text-align:center}
      @media(max-width:560px){.ait-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:.55rem}.ait-card{padding:.8rem .6rem;min-height:104px}.ait-ico{font-size:1.6rem;width:40px;height:40px}}
    `;
    const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
  }

  // role -> readable label (for the header)
  const ROLE_LABEL = {
    strategist:'Strategist', account_manager:'Account Manager', copywriter:'Copywriter',
    content_creator:'Content Creator', designer:'Graphic Designer', video_editor:'Video Editor',
    photographer:'Photographer', social_media_specialist:'Social Media Specialist',
    web_developer:'Web Developer', shopify_designer:'Shopify Designer',
    wordpress_designer:'WordPress Designer', seo_specialist:'SEO Specialist',
    media_buyer:'Media Buyer', other:'Generalist'
  };

  async function renderToolkit(opts){
    injectStyles();
    const { container, supabase, role } = opts;
    const root = typeof container==='string'?document.getElementById(container):container;
    if(!root) return;
    const myRole = role || 'other';

    root.innerHTML = `<div class="ait-empty"><div class="ait-empty-ico">⏳</div>Loading your AI toolkit…</div>`;

    // Tools for my role + universal tools (roles contains my role)
    const { data: tools, error } = await supabase
      .from('ai_tools')
      .select('*')
      .contains('roles', [myRole])
      .order('sort_order',{ascending:true});

    if(error){
      root.innerHTML = `<div class="ait-empty">⚠️ ${esc(error.message)}<br/><span style="font-size:.8rem">Run ai-tools-schema.sql in Supabase.</span></div>`;
      return;
    }
    if(!tools || !tools.length){
      root.innerHTML = `<div class="ait-empty"><div class="ait-empty-ico">🤖</div>No tools mapped to your role yet.</div>`;
      return;
    }

    // Load this user's favorites
    let favSet = new Set();
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if(uid){
        const { data: links } = await supabase.from('user_tool_links').select('tool_id,is_favorite').eq('user_id', uid);
        (links||[]).forEach(l => { if(l.is_favorite) favSet.add(l.tool_id); });
      }
    } catch(_){}

    const cats = ['All', ...Array.from(new Set(tools.map(t => t.category).filter(Boolean))).sort()];
    let activeCat = 'All';

    function draw(){
      const list = activeCat==='All' ? tools : tools.filter(t => t.category===activeCat);
      // favorites first, then by sort_order
      list.sort((a,b)=>{
        const fa=favSet.has(a.id)?0:1, fb=favSet.has(b.id)?0:1;
        if(fa!==fb) return fa-fb;
        return (a.sort_order||100)-(b.sort_order||100);
      });
      root.innerHTML = `
        <div class="ait-bar">
          <div class="ait-sub">Tools picked for <strong style="color:var(--text)">${esc(ROLE_LABEL[myRole]||myRole)}</strong> — click to open, ☆ to pin</div>
          <div class="ait-filter">
            ${cats.map(c=>`<span class="ait-chip ${c===activeCat?'active':''}" data-cat="${esc(c)}">${esc(c)}</span>`).join('')}
          </div>
        </div>
        <div class="ait-grid">
          ${list.map(t=>`
            <a class="ait-card" href="${esc(t.url)}" target="_blank" rel="noopener" data-tool="${t.id}" title="${esc(t.description||t.name)}">
              <button class="ait-fav ${favSet.has(t.id)?'on':''}" data-fav="${t.id}" title="Pin to top" type="button">${favSet.has(t.id)?'★':'☆'}</button>
              <span class="ait-ico">${t.logo_url?`<img src="${esc(t.logo_url)}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:8px"/>`:esc(t.icon||'🤖')}</span>
              <span class="ait-name">${esc(t.name)}</span>
              <span class="ait-cat">${esc(t.category||'')}</span>
            </a>
          `).join('')}
        </div>
        <div class="ait-tip">💡 لو محتاج تول مش موجود هنا، قول للـ admin يضيفه — أو افتح الـ ai_tools table.</div>
      `;
      // category chips
      root.querySelectorAll('.ait-chip').forEach(ch=>{
        ch.onclick=()=>{ activeCat=ch.dataset.cat; draw(); };
      });
      // favorite toggles
      root.querySelectorAll('.ait-fav').forEach(fb=>{
        fb.onclick=async(e)=>{
          e.preventDefault(); e.stopPropagation();
          const tid=fb.dataset.fav;
          const { data: sess } = await supabase.auth.getSession();
          const uid=sess?.session?.user?.id;
          if(!uid) return;
          const isOn=favSet.has(tid);
          if(isOn){
            favSet.delete(tid);
            await supabase.from('user_tool_links').delete().eq('user_id',uid).eq('tool_id',tid);
          } else {
            favSet.add(tid);
            await supabase.from('user_tool_links').upsert({ user_id:uid, tool_id:tid, is_favorite:true });
          }
          draw();
        };
      });
      // track open (best-effort, non-blocking)
      root.querySelectorAll('.ait-card').forEach(card=>{
        card.addEventListener('click', async ()=>{
          try{
            const { data: sess } = await supabase.auth.getSession();
            const uid=sess?.session?.user?.id;
            if(uid){
              supabase.from('user_tool_links').upsert({
                user_id:uid, tool_id:card.dataset.tool,
                is_favorite: favSet.has(card.dataset.tool),
                last_opened_at: new Date().toISOString()
              });
            }
          }catch(_){}
        });
      });
    }
    draw();
  }

  window.AITools = { renderToolkit };
})();
