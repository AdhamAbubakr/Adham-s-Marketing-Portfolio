/* =============================================================================
   Barkar OS — Workflow Engine Module (Phase 2)
   Self-contained. Links every marketing position via handoffs.
   - Team:   Inbox (work handed to my role) + Hand off (deliver to next role)
   - Admin:  Cycle health overview + full handoffs board + create handoff
   - Client: (read-only progress is rendered inline in portal — optional)
   ========================================================================== */

(function(){
  // Role catalog — keys MUST match team_members.role_title used at signup
  const ROLES = [
    { key:'strategist',               label:'Strategist',              icon:'🧠' },
    { key:'account_manager',          label:'Account Manager',         icon:'💼' },
    { key:'copywriter',               label:'Copywriter',              icon:'✍️' },
    { key:'content_creator',          label:'Content Creator',         icon:'📝' },
    { key:'designer',                 label:'Graphic Designer',        icon:'🎨' },
    { key:'video_editor',             label:'Video Editor',            icon:'🎬' },
    { key:'photographer',             label:'Photographer',            icon:'📸' },
    { key:'social_media_specialist',  label:'Social Media Specialist', icon:'📱' },
    { key:'web_developer',            label:'Web Developer',           icon:'💻' },
    { key:'shopify_designer',         label:'Shopify Designer',        icon:'🛒' },
    { key:'wordpress_designer',       label:'WordPress Designer',      icon:'🌐' },
    { key:'seo_specialist',           label:'SEO Specialist',          icon:'🔍' },
    { key:'media_buyer',              label:'Media Buyer',             icon:'🎯' },
    { key:'other',                    label:'Other / Generalist',      icon:'🌟' }
  ];
  const ROLE_BY_KEY = Object.fromEntries(ROLES.map(r => [r.key, r]));

  // Suggested NEXT role in the marketing cycle (for the handoff modal default)
  const NEXT_ROLE = {
    strategist:'account_manager',
    account_manager:'copywriter',
    copywriter:'content_creator',
    content_creator:'designer',
    designer:'social_media_specialist',
    video_editor:'social_media_specialist',
    photographer:'social_media_specialist',
    social_media_specialist:'media_buyer',
    web_developer:'media_buyer',
    shopify_designer:'media_buyer',
    wordpress_designer:'media_buyer',
    seo_specialist:'account_manager',
    media_buyer:'account_manager',
    other:'account_manager'
  };

  const ARTIFACTS = [
    ['strategy','📊 Strategy'],['brief','📋 Brief'],['copy','✍️ Copy / Scripts'],
    ['calendar','🗓️ Content Calendar'],['assets','🎨 Creative Assets'],
    ['landing','🔗 Landing Page'],['store','🛒 Store'],['organic','📱 Organic Content'],
    ['campaign','🎯 Paid Campaign'],['seo','🔍 SEO Work'],['report','📈 Report'],['custom','📦 Custom']
  ];

  const STATUS_META = {
    pending:    { label:'Pending',     bg:'rgba(234,179,8,.15)',  color:'#EAB308' },
    in_progress:{ label:'In Progress', bg:'rgba(168,85,247,.18)', color:'#A855F7' },
    delivered:  { label:'Delivered',   bg:'rgba(6,182,212,.15)',  color:'#06B6D4' },
    accepted:   { label:'Accepted',    bg:'rgba(34,216,143,.15)', color:'#22D88F' },
    blocked:    { label:'Blocked',     bg:'rgba(239,68,68,.15)',  color:'#EF4444' }
  };
  const PRIORITY_META = {
    low:{label:'Low',color:'#9090A8'}, normal:{label:'Normal',color:'#A855F7'},
    high:{label:'High',color:'#EAB308'}, urgent:{label:'Urgent',color:'#EF4444'}
  };

  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function roleChip(key){const r=ROLE_BY_KEY[key]||{icon:'•',label:key||'—'};return `<span class="wf-rolechip">${r.icon} ${esc(r.label)}</span>`;}
  function timeAgo(ts){ if(!ts) return ''; const d=(Date.now()-new Date(ts).getTime())/1000; if(d<60)return 'just now'; if(d<3600)return Math.floor(d/60)+'m ago'; if(d<86400)return Math.floor(d/3600)+'h ago'; return Math.floor(d/86400)+'d ago'; }

  let stylesInjected=false;
  function injectStyles(){
    if(stylesInjected) return; stylesInjected=true;
    const css=`
      .wf-rolechip{display:inline-flex;align-items:center;gap:.3rem;font-size:.74rem;font-weight:600;background:rgba(124,58,237,.12);border:1px solid rgba(124,58,237,.3);color:var(--purple-light,#A855F7);padding:.2rem .55rem;border-radius:50px}
      .wf-grid{display:grid;gap:.8rem}
      .wf-card{background:var(--card,#1C1130);border:1px solid var(--border,rgba(168,85,247,.18));border-radius:12px;padding:1rem 1.1rem;transition:border-color .2s}
      .wf-card:hover{border-color:var(--purple-light,#A855F7)}
      .wf-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:.6rem;flex-wrap:wrap;margin-bottom:.5rem}
      .wf-card-title{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1rem;color:var(--text,#F8F8FC)}
      .wf-card-meta{font-size:.76rem;color:var(--muted,#9090A8);margin-top:.25rem;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}
      .wf-pill{padding:.18rem .55rem;border-radius:50px;font-size:.68rem;font-weight:600;letter-spacing:.03em}
      .wf-flow{display:flex;align-items:center;gap:.4rem;font-size:.78rem;color:var(--muted);margin:.5rem 0}
      .wf-notes{font-size:.84rem;color:var(--muted);background:var(--bg2,#11062A);border:1px solid var(--border);border-radius:8px;padding:.6rem .8rem;margin:.5rem 0;line-height:1.55}
      .wf-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.6rem}
      .wf-btn{padding:.5rem .9rem;border-radius:8px;border:none;font-family:inherit;font-weight:600;font-size:.8rem;cursor:pointer;transition:all .2s;min-height:38px;display:inline-flex;align-items:center;gap:.35rem}
      .wf-btn-primary{background:var(--purple,#7C3AED);color:#fff}
      .wf-btn-primary:hover{background:var(--purple-light,#A855F7)}
      .wf-btn-secondary{background:var(--bg2,#11062A);color:var(--text);border:1px solid var(--border)}
      .wf-btn-secondary:hover{border-color:var(--purple-light)}
      .wf-btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}
      .wf-empty{text-align:center;padding:2.5rem 1rem;color:var(--muted)}
      .wf-empty-icon{font-size:2.4rem;opacity:.5;margin-bottom:.5rem}
      .wf-section-bar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.6rem;margin-bottom:.9rem}
      .wf-count{background:rgba(124,58,237,.15);color:var(--purple-light);font-size:.72rem;font-weight:700;padding:.15rem .5rem;border-radius:50px}
      /* health table */
      .wf-health{width:100%;border-collapse:collapse;font-size:.85rem}
      .wf-health th{text-align:left;padding:.6rem .7rem;background:var(--bg2);color:var(--muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border)}
      .wf-health td{padding:.6rem .7rem;border-bottom:1px solid var(--border);color:var(--text)}
      .wf-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:.4rem}
      /* modal */
      .wf-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;overflow-y:auto}
      .wf-modal{background:var(--card);border:1px solid var(--border-strong,rgba(168,85,247,.4));border-radius:14px;width:100%;max-width:560px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden}
      .wf-modal-head{padding:1.1rem 1.3rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
      .wf-modal-title{font-family:'Space Grotesk',sans-serif;font-weight:600;color:var(--text)}
      .wf-modal-close{background:none;border:none;color:var(--muted);font-size:1.4rem;cursor:pointer}
      .wf-modal-body{padding:1.2rem 1.3rem;overflow-y:auto}
      .wf-modal-actions{padding:.9rem 1.3rem;border-top:1px solid var(--border);display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap}
      .wf-field{margin-bottom:.9rem}
      .wf-field label{display:block;font-size:.78rem;font-weight:600;color:var(--text);margin-bottom:.35rem}
      .wf-field input,.wf-field select,.wf-field textarea{width:100%;background:var(--bg,#0A0118);border:1px solid var(--border);color:var(--text);padding:.7rem .9rem;border-radius:8px;font-family:inherit;font-size:16px;min-height:44px}
      .wf-row2{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
      @media(max-width:560px){.wf-row2{grid-template-columns:1fr;gap:0}.wf-modal-actions{flex-direction:column}.wf-modal-actions .wf-btn{width:100%}}
    `;
    const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
  }

  // ---- shared: create/deliver handoff modal ----
  async function openHandoffModal(opts){
    const { supabase, fromRole, fromMemberId, defaultClientId, onDone, lockClient } = opts;
    const { data: clients } = await supabase.from('clients').select('id,name').order('name');
    const { data: team } = await supabase.from('team_members').select('id,full_name,role_title').eq('status','active').order('full_name');
    const nextRole = fromRole ? (NEXT_ROLE[fromRole] || 'account_manager') : 'strategist';

    const modal=document.createElement('div'); modal.className='wf-modal-bg';
    modal.innerHTML=`
      <div class="wf-modal">
        <div class="wf-modal-head">
          <div class="wf-modal-title">📤 Hand off work</div>
          <button class="wf-modal-close" type="button">&times;</button>
        </div>
        <div class="wf-modal-body">
          <div class="wf-field">
            <label>Client / Project *</label>
            <select id="wfClient" ${lockClient?'disabled':''}>
              <option value="">Choose…</option>
              ${(clients||[]).map(c=>`<option value="${c.id}" ${defaultClientId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="wf-field">
            <label>Title — what's being handed off? *</label>
            <input id="wfTitle" placeholder="e.g. Q2 strategy for SAMA — ready for briefs" />
          </div>
          <div class="wf-row2">
            <div class="wf-field">
              <label>Hand to (role) *</label>
              <select id="wfToRole">
                ${ROLES.map(r=>`<option value="${r.key}" ${r.key===nextRole?'selected':''}>${r.icon} ${esc(r.label)}</option>`).join('')}
              </select>
            </div>
            <div class="wf-field">
              <label>Artifact type</label>
              <select id="wfArtifact">
                ${ARTIFACTS.map(([k,l])=>`<option value="${k}">${esc(l)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="wf-row2">
            <div class="wf-field">
              <label>Specific person (optional)</label>
              <select id="wfToMember"><option value="">Anyone with that role</option>
                ${(team||[]).map(m=>`<option value="${m.id}" data-role="${esc(m.role_title||'')}">${esc(m.full_name||'?')} · ${esc(m.role_title||'')}</option>`).join('')}
              </select>
            </div>
            <div class="wf-field">
              <label>Priority</label>
              <select id="wfPriority">
                <option value="low">Low</option>
                <option value="normal" selected>Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div class="wf-field">
            <label>Due date (optional)</label>
            <input id="wfDue" type="date" />
          </div>
          <div class="wf-field">
            <label>Notes / instructions</label>
            <textarea id="wfNotes" rows="3" placeholder="Context the next person needs to pick this up…"></textarea>
          </div>
        </div>
        <div class="wf-modal-actions">
          <button class="wf-btn wf-btn-secondary" id="wfCancel">Cancel</button>
          <button class="wf-btn wf-btn-primary" id="wfSend">📤 Send handoff</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const close=()=>modal.remove();
    modal.addEventListener('click',e=>{if(e.target===modal)close();});
    modal.querySelector('.wf-modal-close').onclick=close;
    modal.querySelector('#wfCancel').onclick=close;

    modal.querySelector('#wfSend').onclick=async()=>{
      const client_id=modal.querySelector('#wfClient').value || defaultClientId;
      const title=modal.querySelector('#wfTitle').value.trim();
      if(!client_id||!title){ alert('Client and title are required.'); return; }
      const payload={
        client_id,
        from_role: fromRole || null,
        from_member_id: fromMemberId || null,
        to_role: modal.querySelector('#wfToRole').value,
        to_member_id: modal.querySelector('#wfToMember').value || null,
        title,
        artifact_type: modal.querySelector('#wfArtifact').value,
        priority: modal.querySelector('#wfPriority').value,
        due_date: modal.querySelector('#wfDue').value || null,
        notes: modal.querySelector('#wfNotes').value.trim() || null,
        status:'pending'
      };
      const { error } = await supabase.from('workflow_handoffs').insert([payload]);
      if(error){ alert('Error: '+error.message+'\n\n(Run workflow-schema.sql in Supabase if not done.)'); return; }
      close(); onDone && onDone();
    };
  }

  function handoffCard(h, viewerRole, canAct){
    const sm=STATUS_META[h.status]||STATUS_META.pending;
    const pm=PRIORITY_META[h.priority]||PRIORITY_META.normal;
    const art=(ARTIFACTS.find(a=>a[0]===h.artifact_type)||['','📦 '+h.artifact_type])[1];
    return `
      <div class="wf-card" data-h="${h.id}">
        <div class="wf-card-top">
          <div>
            <div class="wf-card-title">${esc(h.title)}</div>
            <div class="wf-card-meta">
              <span>${esc(h.client?.name||'')}</span><span>·</span>
              <span>${esc(art)}</span><span>·</span>
              <span style="color:${pm.color}">●&nbsp;${pm.label}</span>
              ${h.due_date?`<span>·</span><span>📅 ${esc(h.due_date)}</span>`:''}
            </div>
          </div>
          <span class="wf-pill" style="background:${sm.bg};color:${sm.color}">${sm.label}</span>
        </div>
        <div class="wf-flow">${h.from_role?roleChip(h.from_role):'<span class="wf-rolechip">📥 New</span>'} <span>→</span> ${roleChip(h.to_role)}</div>
        ${h.notes?`<div class="wf-notes">${esc(h.notes).replace(/\n/g,'<br/>')}</div>`:''}
        <div class="wf-card-meta">⏱ ${timeAgo(h.updated_at||h.created_at)}</div>
        ${canAct?`
          <div class="wf-actions">
            ${h.status==='pending'?`<button class="wf-btn wf-btn-primary" data-act="start" data-id="${h.id}">▶ Start working</button>`:''}
            ${h.status==='in_progress'?`<button class="wf-btn wf-btn-primary" data-act="accept" data-id="${h.id}">✓ Mark done</button>`:''}
            ${(h.status==='pending'||h.status==='in_progress')?`<button class="wf-btn wf-btn-ghost" data-act="block" data-id="${h.id}">⛔ Block</button>`:''}
            ${h.status==='blocked'?`<button class="wf-btn wf-btn-secondary" data-act="unblock" data-id="${h.id}">↩ Unblock</button>`:''}
            ${h.status==='accepted'?`<span style="font-size:.78rem;color:var(--green,#22D88F)">✓ Completed ${timeAgo(h.accepted_at)}</span>`:''}
          </div>`:''}
      </div>`;
  }

  async function setStatus(supabase, id, status, onDone){
    const patch={ status };
    const { error } = await supabase.from('workflow_handoffs').update(patch).eq('id', id);
    if(error){ alert('Error: '+error.message); return; }
    onDone && onDone();
  }

  function bindCardActions(root, supabase, onDone){
    root.querySelectorAll('[data-act]').forEach(btn=>{
      btn.onclick=async(e)=>{
        e.stopPropagation();
        const id=btn.dataset.id, act=btn.dataset.act;
        if(act==='start')      await setStatus(supabase,id,'in_progress',onDone);
        else if(act==='accept')await setStatus(supabase,id,'accepted',onDone);
        else if(act==='block') await setStatus(supabase,id,'blocked',onDone);
        else if(act==='unblock')await setStatus(supabase,id,'in_progress',onDone);
      };
    });
  }

  // ============================================================
  // TEAM VIEW — Inbox + Handoff
  // ============================================================
  async function renderTeamWorkflow(opts){
    injectStyles();
    const { container, supabase, member } = opts; // member = team_members row
    const root = typeof container==='string'?document.getElementById(container):container;
    if(!root) return;
    const myRole = member?.role_title || '';
    const myId = member?.id || null;

    root.innerHTML=`<div class="wf-empty"><div class="wf-empty-icon">⏳</div>Loading workflow…</div>`;

    const { data, error } = await supabase
      .from('workflow_handoffs')
      .select('*, client:clients(id,name)')
      .order('updated_at',{ascending:false})
      .limit(100);
    if(error){ root.innerHTML=`<div class="wf-empty">⚠️ ${esc(error.message)}<br/><span style="font-size:.8rem">Run workflow-schema.sql in Supabase.</span></div>`; return; }

    const all = data||[];
    const inbox    = all.filter(h => (h.to_role===myRole || h.to_member_id===myId) && h.status!=='accepted');
    const sent     = all.filter(h => (h.from_role===myRole || h.from_member_id===myId));
    const reload   = () => renderTeamWorkflow(opts);

    root.innerHTML=`
      <div class="wf-section-bar">
        <div style="font-weight:600;color:var(--text);display:flex;align-items:center;gap:.5rem">📥 My Inbox <span class="wf-count">${inbox.length}</span></div>
        <button class="wf-btn wf-btn-primary" id="wfNewHandoff">📤 Hand off work</button>
      </div>
      <div class="wf-grid" id="wfInbox">
        ${inbox.length?inbox.map(h=>handoffCard(h,myRole,true)).join(''):`<div class="wf-empty"><div class="wf-empty-icon">✨</div>Nothing waiting on you. You're all caught up.</div>`}
      </div>
      ${sent.length?`
        <div class="wf-section-bar" style="margin-top:1.6rem">
          <div style="font-weight:600;color:var(--text);display:flex;align-items:center;gap:.5rem">📤 Handed off by me <span class="wf-count">${sent.length}</span></div>
        </div>
        <div class="wf-grid">${sent.slice(0,10).map(h=>handoffCard(h,myRole,false)).join('')}</div>
      `:''}
    `;
    document.getElementById('wfNewHandoff').onclick=()=>openHandoffModal({
      supabase, fromRole:myRole, fromMemberId:myId,
      onDone: reload
    });
    bindCardActions(document.getElementById('wfInbox'), supabase, reload);
  }

  // ============================================================
  // ADMIN VIEW — Cycle health + full board + create handoff
  // ============================================================
  async function renderAdminWorkflow(opts){
    injectStyles();
    const { container, supabase } = opts;
    const root = typeof container==='string'?document.getElementById(container):container;
    if(!root) return;
    root.innerHTML=`<div class="wf-empty"><div class="wf-empty-icon">⏳</div>Loading workflow…</div>`;

    const [{ data:health }, { data:handoffs, error }] = await Promise.all([
      supabase.from('workflow_cycle_health').select('*').order('open_handoffs',{ascending:false}),
      supabase.from('workflow_handoffs').select('*, client:clients(id,name)').order('updated_at',{ascending:false}).limit(150)
    ]);
    if(error){ root.innerHTML=`<div class="wf-empty">⚠️ ${esc(error.message)}<br/><span style="font-size:.8rem">Run workflow-schema.sql in Supabase.</span></div>`; return; }

    const reload=()=>renderAdminWorkflow(opts);
    const list=handoffs||[];
    const open=list.filter(h=>h.status==='pending'||h.status==='in_progress');
    const blocked=list.filter(h=>h.status==='blocked');

    root.innerHTML=`
      <div class="wf-section-bar">
        <div style="font-weight:600;color:var(--text)">🩺 Cycle Health</div>
        <button class="wf-btn wf-btn-primary" id="wfAdminNew">+ New handoff</button>
      </div>
      <div style="overflow-x:auto;margin-bottom:1.6rem">
        <table class="wf-health">
          <thead><tr><th>Client</th><th>Open</th><th>Blocked</th><th>Done</th><th>Next due</th><th>Last activity</th></tr></thead>
          <tbody>
            ${(health||[]).filter(h=>h.total_handoffs>0).map(h=>{
              const stuck=h.blocked_handoffs>0;
              return `<tr>
                <td><span class="wf-dot" style="background:${stuck?'#EF4444':(h.open_handoffs>0?'#EAB308':'#22D88F')}"></span>${esc(h.client_name||'—')}</td>
                <td>${h.open_handoffs||0}</td>
                <td style="color:${h.blocked_handoffs>0?'#EF4444':'inherit'}">${h.blocked_handoffs||0}</td>
                <td style="color:var(--green,#22D88F)">${h.done_handoffs||0}</td>
                <td>${h.next_due?esc(h.next_due):'—'}</td>
                <td style="color:var(--muted)">${h.last_activity?timeAgo(h.last_activity):'—'}</td>
              </tr>`;
            }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:1.5rem">No handoffs yet.</td></tr>`}
          </tbody>
        </table>
      </div>

      ${blocked.length?`
        <div class="wf-section-bar"><div style="font-weight:600;color:#EF4444;display:flex;gap:.5rem;align-items:center">⛔ Blocked <span class="wf-count" style="background:rgba(239,68,68,.15);color:#EF4444">${blocked.length}</span></div></div>
        <div class="wf-grid" id="wfBlocked" style="margin-bottom:1.6rem">${blocked.map(h=>handoffCard(h,'admin',true)).join('')}</div>
      `:''}

      <div class="wf-section-bar"><div style="font-weight:600;color:var(--text);display:flex;gap:.5rem;align-items:center">🔄 Open handoffs <span class="wf-count">${open.length}</span></div></div>
      <div class="wf-grid" id="wfOpen">
        ${open.length?open.map(h=>handoffCard(h,'admin',true)).join(''):`<div class="wf-empty"><div class="wf-empty-icon">✨</div>No open handoffs — every cycle is moving.</div>`}
      </div>
    `;
    document.getElementById('wfAdminNew').onclick=()=>openHandoffModal({ supabase, fromRole:null, fromMemberId:null, onDone:reload });
    bindCardActions(root, supabase, reload);
  }

  window.Workflow = { renderTeamWorkflow, renderAdminWorkflow, ROLES };
})();
