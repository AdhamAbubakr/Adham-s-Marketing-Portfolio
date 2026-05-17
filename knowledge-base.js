/* =============================================================================
   Barkar OS — Knowledge Base Module (Phase 4)
   Per-role default Playbook (readable in-app) + workspace docs + personal uploads.
   ========================================================================== */

(function(){
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

  // Lightweight playbook renderer: lines starting with an emoji/heading get styled
  function renderPlaybook(text){
    const lines = String(text||'').split('\n');
    let html = '';
    lines.forEach(ln=>{
      const t = ln.trim();
      if(!t){ html += '<div style="height:.5rem"></div>'; return; }
      // Heading line: starts with an emoji + ALL CAPS-ish word
      if(/^[\u{1F000}-\u{1FFFF}☀-➿]/u.test(t) && t === t.toUpperCase().slice(0, t.length)){
        html += `<div class="kb-h">${esc(t)}</div>`;
      } else if(/^[\u{1F000}-\u{1FFFF}☀-➿]/u.test(t)){
        html += `<div class="kb-h">${esc(t)}</div>`;
      } else if(/^\d+\.\s/.test(t) || /^-\s/.test(t)){
        html += `<div class="kb-li">${esc(t)}</div>`;
      } else {
        html += `<div class="kb-p">${esc(t)}</div>`;
      }
    });
    return html;
  }

  let stylesInjected=false;
  function injectStyles(){
    if(stylesInjected) return; stylesInjected=true;
    const css=`
      .kb-wrap{display:flex;flex-direction:column;gap:1rem}
      .kb-playbook{background:var(--card,#1C1130);border:1px solid var(--border,rgba(168,85,247,.18));border-radius:14px;overflow:hidden}
      .kb-pb-head{display:flex;justify-content:space-between;align-items:center;gap:.6rem;padding:1rem 1.2rem;cursor:pointer;background:linear-gradient(135deg,rgba(124,58,237,.12),rgba(236,72,153,.05))}
      .kb-pb-title{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.05rem;color:var(--text,#F8F8FC)}
      .kb-pb-toggle{color:var(--muted,#9090A8);font-size:.8rem;font-weight:600}
      .kb-pb-body{padding:1.2rem 1.4rem;border-top:1px solid var(--border);max-height:520px;overflow-y:auto;display:none}
      .kb-pb-body.open{display:block}
      .kb-h{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:.9rem;color:var(--purple-light,#A855F7);margin:1rem 0 .5rem;letter-spacing:.02em}
      .kb-h:first-child{margin-top:0}
      .kb-li{font-size:.88rem;color:var(--text,#F8F8FC);line-height:1.65;padding-left:1rem;margin:.2rem 0}
      .kb-p{font-size:.88rem;color:var(--muted,#9090A8);line-height:1.7;margin:.2rem 0}
      .kb-files{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:1.1rem 1.2rem}
      .kb-files-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.6rem;margin-bottom:.8rem}
      .kb-files-title{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.95rem;color:var(--text)}
      .kb-file{display:flex;align-items:center;gap:.7rem;padding:.6rem .7rem;background:var(--bg2,#11062A);border:1px solid var(--border);border-radius:9px;margin-bottom:.5rem;font-size:.85rem}
      .kb-file a{color:var(--purple-light);text-decoration:none;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .kb-file .kb-del{background:none;border:none;color:var(--muted);cursor:pointer;font-size:.95rem;padding:.2rem .4rem}
      .kb-file .kb-del:hover{color:#EF4444}
      .kb-tag{font-size:.66rem;padding:.15rem .45rem;border-radius:50px;font-weight:600;letter-spacing:.03em}
      .kb-tag-personal{background:rgba(6,182,212,.15);color:#06B6D4}
      .kb-tag-workspace{background:rgba(34,216,143,.15);color:#22D88F}
      .kb-btn{padding:.55rem 1rem;border-radius:8px;border:none;font-family:inherit;font-weight:600;font-size:.82rem;cursor:pointer;background:var(--purple,#7C3AED);color:#fff;min-height:38px;display:inline-flex;align-items:center;gap:.4rem}
      .kb-btn:hover{background:var(--purple-light,#A855F7)}
      .kb-empty{color:var(--muted);font-size:.84rem;text-align:center;padding:1rem}
      .kb-upload-row{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-top:.6rem}
      .kb-upload-row input[type=file]{font-size:.82rem;color:var(--muted);flex:1;min-width:160px}
    `;
    const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
  }

  async function renderKB(opts){
    injectStyles();
    const { container, supabase, role } = opts;
    const root = typeof container==='string'?document.getElementById(container):container;
    if(!root) return;
    const myRole = role || 'other';

    root.innerHTML = `<div class="kb-empty">⏳ Loading your playbook…</div>`;

    // Default playbook for this role + 'all'; workspace docs; my personal docs
    const { data: kb, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .or(`role.eq.${myRole},role.eq.all`)
      .order('sort_order',{ascending:true});

    if(error){
      root.innerHTML = `<div class="kb-empty">⚠️ ${esc(error.message)}<br/><span style="font-size:.78rem">Run barkar-setup.sql in Supabase.</span></div>`;
      return;
    }

    const playbooks = (kb||[]).filter(k => k.type==='default');
    const workspace  = (kb||[]).filter(k => k.type==='workspace');
    const personal   = (kb||[]).filter(k => k.type==='personal');

    let html = `<div class="kb-wrap">`;

    // Default playbooks (collapsible)
    if(playbooks.length){
      playbooks.forEach((p, i)=>{
        html += `
          <div class="kb-playbook">
            <div class="kb-pb-head" data-pb="${i}">
              <div class="kb-pb-title">${esc(p.title)}</div>
              <div class="kb-pb-toggle" data-toggle="${i}">▾ Read</div>
            </div>
            <div class="kb-pb-body ${i===0?'open':''}" data-body="${i}">${renderPlaybook(p.content)}</div>
          </div>`;
      });
    } else {
      html += `<div class="kb-empty">No default playbook seeded for this role yet.</div>`;
    }

    // Files (workspace + personal)
    html += `
      <div class="kb-files">
        <div class="kb-files-head">
          <div class="kb-files-title">📎 Reference Files</div>
        </div>
        <div id="kbFileList">
          ${workspace.map(f=>fileRow(f,false)).join('')}
          ${personal.map(f=>fileRow(f,true)).join('')}
          ${(!workspace.length && !personal.length)?'<div class="kb-empty">No files yet. Upload a reference you want to keep handy.</div>':''}
        </div>
        <div class="kb-upload-row">
          <input type="file" id="kbFile" accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg" />
          <button class="kb-btn" id="kbUpload">⬆ Upload reference</button>
        </div>
      </div>
    </div>`;

    root.innerHTML = html;

    // toggles
    root.querySelectorAll('.kb-pb-head').forEach(h=>{
      h.onclick=()=>{
        const i=h.dataset.pb;
        const body=root.querySelector(`[data-body="${i}"]`);
        const tog=root.querySelector(`[data-toggle="${i}"]`);
        const open=body.classList.toggle('open');
        tog.textContent = open ? '▴ Hide' : '▾ Read';
      };
    });

    // delete personal
    root.querySelectorAll('.kb-del').forEach(b=>{
      b.onclick=async()=>{
        if(!confirm('Delete this reference?')) return;
        await supabase.from('knowledge_base').delete().eq('id', b.dataset.id);
        renderKB(opts);
      };
    });

    // upload
    root.querySelector('#kbUpload').onclick=async()=>{
      const fileInput=root.querySelector('#kbFile');
      const file=fileInput.files[0];
      if(!file){ alert('Choose a file first.'); return; }
      if(file.size > 15*1024*1024){ alert('File too large (max 15MB).'); return; }
      const btn=root.querySelector('#kbUpload');
      btn.disabled=true; btn.textContent='⏳ Uploading…';
      try{
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess?.session?.user?.id;
        if(!uid){ alert('Session expired.'); return; }
        let uname = sess?.session?.user?.email || 'Me';
        const ext=(file.name.split('.').pop()||'bin').toLowerCase();
        const path=`${uid}/kb-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('knowledge').upload(path, file, { contentType:file.type, upsert:false });
        if(upErr){ alert('Upload failed: '+upErr.message); btn.disabled=false; btn.textContent='⬆ Upload reference'; return; }
        const { data: pub } = supabase.storage.from('knowledge').getPublicUrl(path);
        const { error: insErr } = await supabase.from('knowledge_base').insert([{
          role: myRole, title: file.name, file_url: pub.publicUrl, file_name: file.name,
          type:'personal', uploaded_by: uid, uploaded_by_name: uname
        }]);
        if(insErr){ alert('Save failed: '+insErr.message); btn.disabled=false; btn.textContent='⬆ Upload reference'; return; }
        renderKB(opts);
      }catch(e){ alert('Error: '+e.message); btn.disabled=false; btn.textContent='⬆ Upload reference'; }
    };
  }

  function fileRow(f, isPersonal){
    return `
      <div class="kb-file">
        <span>${isPersonal?'👤':'🏢'}</span>
        <a href="${esc(f.file_url)}" target="_blank" rel="noopener">${esc(f.file_name||f.title)}</a>
        <span class="kb-tag ${isPersonal?'kb-tag-personal':'kb-tag-workspace'}">${isPersonal?'personal':'workspace'}</span>
        ${isPersonal?`<button class="kb-del" data-id="${f.id}" title="Delete">🗑️</button>`:''}
      </div>`;
  }

  window.KnowledgeBase = { renderKB };
})();
