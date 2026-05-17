/* =============================================================================
   Barkar OS — Team Content Pipeline Module (Phase 5)
   Role-aware view of the content_items pipeline inside the team portal.
   Highlights what THIS role should act on, lets them advance stages + comment.
   ========================================================================== */

(function(){
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

  const STATUS = {
    draft:      { label:'Draft',      bg:'rgba(144,144,168,.15)', color:'#9090A8', next:'review' },
    review:     { label:'In Review',  bg:'rgba(234,179,8,.15)',   color:'#EAB308', next:'approved' },
    approved:   { label:'Approved',   bg:'rgba(34,216,143,.15)',  color:'#22D88F', next:'scheduled' },
    scheduled:  { label:'Scheduled',  bg:'rgba(6,182,212,.15)',   color:'#06B6D4', next:'published' },
    published:  { label:'Published',  bg:'rgba(124,58,237,.18)',  color:'#A855F7', next:null },
    rejected:   { label:'Rejected',   bg:'rgba(239,68,68,.15)',   color:'#EF4444', next:'draft' }
  };

  // Which pipeline stages each role typically owns (for the "Needs you" highlight)
  const ROLE_FOCUS = {
    strategist:['draft'],
    account_manager:['draft','review','approved'],
    copywriter:['draft'],
    content_creator:['draft','review'],
    designer:['draft','review'],
    video_editor:['draft','review'],
    photographer:['draft','review'],
    social_media_specialist:['approved','scheduled'],
    seo_specialist:['draft'],
    web_developer:[], shopify_designer:[], wordpress_designer:[],
    media_buyer:['approved','published'],
    other:['draft','review']
  };

  let stylesInjected=false;
  function injectStyles(){
    if(stylesInjected) return; stylesInjected=true;
    const css=`
      .cnt-bar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-bottom:.9rem}
      .cnt-bar select{background:var(--bg2,#11062A);border:1px solid var(--border,rgba(168,85,247,.18));color:var(--text);padding:.5rem .7rem;border-radius:8px;font-family:inherit;font-size:.82rem;min-height:38px}
      .cnt-bar .cnt-spacer{flex:1}
      .cnt-pill{font-size:.72rem;font-weight:700;padding:.15rem .55rem;border-radius:50px;background:rgba(124,58,237,.15);color:var(--purple-light,#A855F7)}
      .cnt-grid{display:grid;gap:.7rem}
      .cnt-card{background:var(--card,#1C1130);border:1px solid var(--border);border-radius:12px;padding:1rem 1.1rem;transition:border-color .2s}
      .cnt-card.focus{border-color:var(--purple-light,#A855F7);box-shadow:0 0 0 1px rgba(168,85,247,.25)}
      .cnt-top{display:flex;justify-content:space-between;align-items:flex-start;gap:.6rem;flex-wrap:wrap;margin-bottom:.4rem}
      .cnt-title{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1rem;color:var(--text,#F8F8FC)}
      .cnt-meta{font-size:.76rem;color:var(--muted,#9090A8);display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-top:.25rem}
      .cnt-st{padding:.18rem .55rem;border-radius:50px;font-size:.68rem;font-weight:700}
      .cnt-cap{font-size:.84rem;color:var(--muted);background:var(--bg2,#11062A);border:1px solid var(--border);border-radius:8px;padding:.55rem .7rem;margin:.5rem 0;line-height:1.55;max-height:90px;overflow:auto;white-space:pre-wrap}
      .cnt-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem}
      .cnt-btn{padding:.45rem .8rem;border-radius:8px;border:none;font-family:inherit;font-weight:600;font-size:.78rem;cursor:pointer;min-height:36px;display:inline-flex;align-items:center;gap:.35rem}
      .cnt-btn-p{background:var(--purple,#7C3AED);color:#fff}.cnt-btn-p:hover{background:var(--purple-light,#A855F7)}
      .cnt-btn-s{background:var(--bg2);color:var(--text);border:1px solid var(--border)}.cnt-btn-s:hover{border-color:var(--purple-light)}
      .cnt-empty{text-align:center;padding:2.2rem 1rem;color:var(--muted)}
      .cnt-empty-i{font-size:2.2rem;opacity:.5;margin-bottom:.5rem}
      .cnt-files a{color:var(--purple-light);font-size:.78rem;text-decoration:none;margin-right:.6rem}
      .cnt-sec-h{display:flex;align-items:center;gap:.5rem;font-weight:600;color:var(--text);margin:1.2rem 0 .7rem;font-size:.95rem}
    `;
    const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
  }

  async function renderTeamContent(opts){
    injectStyles();
    const { container, supabase, member } = opts;
    const root = typeof container==='string'?document.getElementById(container):container;
    if(!root) return;
    const myRole = member?.role_title || 'other';
    const focusStages = ROLE_FOCUS[myRole] || [];

    root.innerHTML = `<div class="cnt-empty"><div class="cnt-empty-i">⏳</div>Loading content pipeline…</div>`;

    const { data, error } = await supabase
      .from('content_items')
      .select('*, client:clients(id,name)')
      .order('scheduled_date',{ascending:true,nullsLast:true})
      .order('updated_at',{ascending:false})
      .limit(200);

    if(error){
      root.innerHTML = `<div class="cnt-empty">⚠️ ${esc(error.message)}<br/><span style="font-size:.78rem">Run barkar-setup.sql (includes content team access).</span></div>`;
      return;
    }
    const all = data || [];
    if(!all.length){
      root.innerHTML = `<div class="cnt-empty"><div class="cnt-empty-i">📅</div>No content in the pipeline yet.</div>`;
      return;
    }

    // build client filter options
    const clients = [...new Map(all.filter(c=>c.client).map(c=>[c.client.id,c.client])).values()];
    const sess = await supabase.auth.getSession();
    const myUid = sess?.data?.session?.user?.id;

    let fClient='', fStatus='';
    function draw(){
      let list = all.filter(c =>
        (!fClient || c.client_id===fClient) &&
        (!fStatus || c.status===fStatus)
      );
      const needsYou = list.filter(c => focusStages.includes(c.status));
      const mine     = list.filter(c => c.assigned_to===myUid);
      const rest     = list.filter(c => !focusStages.includes(c.status) && c.assigned_to!==myUid);

      const card = (c)=>{
        const st=STATUS[c.status]||STATUS.draft;
        const isFocus=focusStages.includes(c.status);
        return `
          <div class="cnt-card ${isFocus?'focus':''}">
            <div class="cnt-top">
              <div>
                <div class="cnt-title">${esc(c.title)}</div>
                <div class="cnt-meta">
                  <span>${esc(c.client?.name||'—')}</span><span>·</span>
                  <span>${esc(c.platform||'')}</span><span>·</span>
                  <span>${esc(c.content_type||'')}</span>
                  ${c.scheduled_date?`<span>·</span><span>📅 ${esc(c.scheduled_date)}${c.scheduled_time?' '+esc(String(c.scheduled_time).slice(0,5)):''}</span>`:''}
                  ${c.assigned_to===myUid?'<span>·</span><span style="color:var(--purple-light)">👤 you</span>':''}
                </div>
              </div>
              <span class="cnt-st" style="background:${st.bg};color:${st.color}">${st.label}</span>
            </div>
            ${c.caption?`<div class="cnt-cap">${esc(c.caption)}</div>`:''}
            ${c.notes?`<div class="cnt-meta">📝 ${esc(c.notes)}</div>`:''}
            <div class="cnt-actions">
              ${st.next?`<button class="cnt-btn cnt-btn-p" data-adv="${c.id}" data-to="${st.next}">→ Move to ${STATUS[st.next].label}</button>`:''}
              <button class="cnt-btn cnt-btn-s" data-cmt="${c.id}">💬 Comment</button>
              ${c.assigned_to!==myUid?`<button class="cnt-btn cnt-btn-s" data-claim="${c.id}">✋ Assign to me</button>`:''}
            </div>
          </div>`;
      };

      root.innerHTML = `
        <div class="cnt-bar">
          <select id="cntClient"><option value="">All clients</option>${clients.map(c=>`<option value="${c.id}" ${fClient===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
          <select id="cntStatus"><option value="">All statuses</option>${Object.keys(STATUS).map(s=>`<option value="${s}" ${fStatus===s?'selected':''}>${STATUS[s].label}</option>`).join('')}</select>
          <span class="cnt-spacer"></span>
          <span class="cnt-pill">${needsYou.length} need you</span>
        </div>
        ${needsYou.length?`<div class="cnt-sec-h">🎯 Needs your role <span class="cnt-pill">${needsYou.length}</span></div><div class="cnt-grid">${needsYou.map(card).join('')}</div>`:''}
        ${mine.filter(c=>!focusStages.includes(c.status)).length?`<div class="cnt-sec-h">👤 Assigned to me</div><div class="cnt-grid">${mine.filter(c=>!focusStages.includes(c.status)).map(card).join('')}</div>`:''}
        <div class="cnt-sec-h">📋 All pipeline <span class="cnt-pill">${rest.length}</span></div>
        <div class="cnt-grid">${rest.length?rest.map(card).join(''):'<div class="cnt-empty">Nothing else here.</div>'}</div>
      `;

      document.getElementById('cntClient').onchange=(e)=>{fClient=e.target.value;draw();};
      document.getElementById('cntStatus').onchange=(e)=>{fStatus=e.target.value;draw();};

      root.querySelectorAll('[data-adv]').forEach(b=>{
        b.onclick=async()=>{
          const id=b.dataset.adv, to=b.dataset.to;
          if(!confirm(`Move "${(all.find(x=>x.id===id)||{}).title||''}" to ${STATUS[to].label}?`)) return;
          const { error } = await supabase.from('content_items').update({ status:to, updated_at:new Date().toISOString() }).eq('id', id);
          if(error){ alert(error.message); return; }
          renderTeamContent(opts);
        };
      });
      root.querySelectorAll('[data-claim]').forEach(b=>{
        b.onclick=async()=>{
          const { error } = await supabase.from('content_items').update({ assigned_to:myUid, updated_at:new Date().toISOString() }).eq('id', b.dataset.claim);
          if(error){ alert(error.message); return; }
          renderTeamContent(opts);
        };
      });
      root.querySelectorAll('[data-cmt]').forEach(b=>{
        b.onclick=async()=>{
          const msg=prompt('Add a comment for the team:');
          if(!msg||!msg.trim()) return;
          const { error } = await supabase.from('content_comments').insert([{
            content_id:b.dataset.cmt, author_id:myUid,
            author_name: member?.full_name || 'Team', message: msg.trim()
          }]);
          if(error){ alert(error.message); return; }
          alert('✓ Comment added.');
        };
      });
    }
    draw();
  }

  window.ContentTeam = { renderTeamContent };
})();
