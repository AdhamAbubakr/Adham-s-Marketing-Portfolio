/* =============================================================================
   Barkar — Ad Accounts Module
   Self-contained system for per-client per-platform ad account dashboards.
   - Admin: full CRUD + assign team + view detailed metrics + CSV import
   - Team (media_buyer/account_manager): assigned accounts + CSV import
   - Client: read-only view of their accounts + KPIs
   ========================================================================== */

(function(){
  // Platform catalog — icons + brand colors for visual consistency
  const PLATFORMS = [
    { key:'meta',      label:'Meta (Facebook/Instagram)', short:'Meta',      icon:'📘', color:'#1877F2' },
    { key:'google',    label:'Google Ads',                short:'Google',    icon:'🔍', color:'#34A853' },
    { key:'tiktok',    label:'TikTok Ads',                short:'TikTok',    icon:'🎵', color:'#FE2C55' },
    { key:'snapchat',  label:'Snapchat Ads',              short:'Snap',      icon:'👻', color:'#FFFC00' },
    { key:'x',         label:'X (Twitter) Ads',           short:'X',         icon:'𝕏',  color:'#000000' },
    { key:'linkedin',  label:'LinkedIn Ads',              short:'LinkedIn',  icon:'💼', color:'#0A66C2' },
    { key:'pinterest', label:'Pinterest Ads',             short:'Pinterest', icon:'📌', color:'#E60023' },
    { key:'youtube',   label:'YouTube Ads',               short:'YouTube',   icon:'▶️',  color:'#FF0000' },
    { key:'other',     label:'Other Platform',            short:'Other',     icon:'📊', color:'#7C3AED' }
  ];
  const PLATFORM_BY_KEY = Object.fromEntries(PLATFORMS.map(p => [p.key, p]));

  // CSV column auto-mapping — common headers across platforms
  const COL_GUESS = {
    date: [/^date$/i, /^day$/i, /^reporting date$/i, /^report date$/i, /^تاريخ$/i],
    spend: [/spend/i, /amount spent/i, /^cost$/i, /total cost/i, /^المصروف/i],
    impressions: [/impressions/i, /^مرات الظهور/i],
    reach: [/^reach$/i, /^وصول/i],
    frequency: [/frequency/i, /^معدل التكرار/i],
    clicks: [/^clicks$/i, /^all clicks$/i, /^النقرات/i],
    link_clicks: [/link clicks/i, /^outbound clicks$/i],
    ctr: [/^ctr$/i, /click[- ]through/i],
    cpc: [/^cpc$/i, /cost per click/i, /^تكلفة النقرة/i],
    cpm: [/^cpm$/i, /cost per 1[,.]?000/i],
    conversions: [/^conversions$/i, /^results$/i, /^purchases?$/i, /^leads?$/i, /^النتائج/i, /^التحويلات/i],
    conversion_value: [/conversion value/i, /purchase[s]? value/i, /^revenue$/i, /^القيمة/i],
    roas: [/^roas$/i, /return on ad/i],
    video_views: [/video views/i, /thruplay/i, /^المشاهدات/i],
    engagements: [/engagement/i, /^التفاعل/i],
    campaign_name: [/^campaign name$/i, /^campaign$/i, /^اسم الحملة/i],
    ad_set_name: [/ad ?set/i, /^ad ?group/i]
  };

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function fmtNum(n) {
    if (n == null) return '—';
    const num = Number(n);
    if (!isFinite(num)) return '—';
    if (Math.abs(num) >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (num % 1 === 0) return num.toString();
    return num.toFixed(2);
  }
  function fmtCurrency(n, ccy) {
    if (n == null) return '—';
    return (ccy || 'USD') + ' ' + fmtNum(n);
  }
  function platformBadge(key) {
    const p = PLATFORM_BY_KEY[key] || PLATFORM_BY_KEY.other;
    return `<span class="aa-pf-pill" style="background:${p.color}22;border:1px solid ${p.color}55;color:${p.color}"><span style="font-size:.95em">${p.icon}</span> ${escHtml(p.short)}</span>`;
  }

  // Robust CSV parser — handles quotes + commas inside quotes
  function parseCSV(text) {
    const lines = [];
    const rows = [];
    let row = [], cell = '', inQuote = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], next = text[i+1];
      if (inQuote) {
        if (ch === '"' && next === '"') { cell += '"'; i++; }
        else if (ch === '"') inQuote = false;
        else cell += ch;
      } else {
        if (ch === '"') inQuote = true;
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n' || ch === '\r') {
          if (ch === '\r' && next === '\n') i++;
          row.push(cell); rows.push(row); row = []; cell = '';
        } else cell += ch;
      }
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.length && r.some(c => String(c).trim() !== ''));
  }
  function autoMapColumns(headers) {
    const map = {};
    headers.forEach((h, i) => {
      const norm = String(h).trim();
      for (const field in COL_GUESS) {
        if (map[field] !== undefined) continue;
        if (COL_GUESS[field].some(rx => rx.test(norm))) { map[field] = i; break; }
      }
    });
    return map;
  }
  function parseDateValue(v) {
    if (!v) return null;
    const s = String(v).trim();
    // Try YYYY-MM-DD
    const m1 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m1) return `${m1[1]}-${String(m1[2]).padStart(2,'0')}-${String(m1[3]).padStart(2,'0')}`;
    // Try DD/MM/YYYY or MM/DD/YYYY (assume DD/MM if first part > 12)
    const m2 = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/);
    if (m2) {
      let a = parseInt(m2[1]), b = parseInt(m2[2]), y = m2[3];
      if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
      let dd, mm;
      if (a > 12) { dd = a; mm = b; }
      else if (b > 12) { dd = b; mm = a; }
      else { dd = a; mm = b; } // ambiguous → assume DD/MM (international)
      return `${y}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
    }
    const d = new Date(s);
    if (!isNaN(d)) return d.toISOString().slice(0,10);
    return null;
  }
  function parseNumericValue(v) {
    if (v == null || v === '') return 0;
    const s = String(v).replace(/[^\d.\-]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  // ============================================================
  // STYLE INJECTION (only once)
  // ============================================================
  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const css = `
      .aa-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem}
      .aa-card{background:var(--card,#1C1130);border:1px solid var(--border,rgba(168,85,247,.18));border-radius:14px;padding:1.2rem;transition:all .25s;cursor:pointer;position:relative;overflow:hidden}
      .aa-card:hover{border-color:var(--purple-light,#A855F7);transform:translateY(-3px);box-shadow:0 12px 30px rgba(124,58,237,.18)}
      .aa-card-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.8rem;gap:.5rem;flex-wrap:wrap}
      .aa-card-title{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1.05rem;color:var(--text);line-height:1.3;flex:1;min-width:0;word-break:break-word}
      .aa-card-client{font-size:.78rem;color:var(--muted);margin-top:.2rem}
      .aa-card-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem;margin-top:.8rem;padding-top:.8rem;border-top:1px solid var(--border)}
      .aa-kpi-num{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.05rem;color:var(--text);line-height:1.1}
      .aa-kpi-lbl{font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:.2rem}
      .aa-card-foot{display:flex;justify-content:space-between;align-items:center;margin-top:.8rem;font-size:.74rem;color:var(--muted)}
      .aa-pf-pill{display:inline-flex;align-items:center;gap:.3rem;padding:.22rem .55rem;border-radius:50px;font-size:.72rem;font-weight:600;letter-spacing:.02em}
      .aa-status-pill{padding:.18rem .5rem;border-radius:50px;font-size:.66rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
      .aa-status-active{background:rgba(34,216,143,.15);color:var(--green,#22D88F)}
      .aa-status-paused{background:rgba(234,179,8,.15);color:#EAB308}
      .aa-status-disconnected{background:rgba(239,68,68,.15);color:#EF4444}
      .aa-status-archived{background:rgba(144,144,168,.15);color:var(--muted,#9090A8)}

      .aa-toolbar{display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1.2rem;align-items:center}
      .aa-toolbar select, .aa-toolbar input{background:var(--bg,#0A0118);border:1px solid var(--border);color:var(--text);padding:.55rem .75rem;border-radius:8px;font-family:inherit;font-size:.85rem;min-height:38px}

      .aa-empty{text-align:center;padding:3.5rem 1rem;color:var(--muted)}
      .aa-empty-icon{font-size:3rem;margin-bottom:.8rem;opacity:.55}

      /* Detail view */
      .aa-detail{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:1.4rem}
      .aa-detail-head{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:1.2rem;padding-bottom:1.2rem;border-bottom:1px solid var(--border)}
      .aa-detail-title{font-family:'Space Grotesk',sans-serif;font-size:1.4rem;font-weight:700;color:var(--text);margin-bottom:.3rem}
      .aa-detail-sub{font-size:.85rem;color:var(--muted)}
      .aa-detail-actions{display:flex;gap:.5rem;flex-wrap:wrap}

      .aa-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.8rem;margin-bottom:1.4rem}
      .aa-kpi-card{background:var(--bg2,#11062A);border:1px solid var(--border);border-radius:10px;padding:1rem;position:relative;overflow:hidden}
      .aa-kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--purple,#7C3AED),var(--magenta,#EC4899))}
      .aa-kpi-big{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.5rem;color:var(--text);line-height:1}
      .aa-kpi-big-lbl{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:.4rem}

      .aa-chart-wrap{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:1.2rem;margin-bottom:1.4rem;overflow-x:auto}
      .aa-chart-svg{width:100%;height:240px;min-width:400px;display:block}

      .aa-table{width:100%;border-collapse:collapse;font-size:.85rem}
      .aa-table th{text-align:left;padding:.7rem .8rem;background:var(--bg2);color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;font-weight:600;border-bottom:1px solid var(--border)}
      .aa-table td{padding:.65rem .8rem;border-bottom:1px solid var(--border);color:var(--text)}
      .aa-table tr:hover td{background:var(--bg2)}

      /* Modal */
      .aa-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;overflow-y:auto}
      .aa-modal{background:var(--card);border:1px solid var(--border-strong,rgba(168,85,247,.4));border-radius:14px;width:100%;max-width:640px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.5)}
      .aa-modal-head{padding:1.1rem 1.4rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:var(--card)}
      .aa-modal-title{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1.05rem;color:var(--text)}
      .aa-modal-close{background:transparent;border:none;color:var(--muted);font-size:1.4rem;cursor:pointer;padding:.3rem .5rem;line-height:1}
      .aa-modal-body{padding:1.2rem 1.4rem;overflow-y:auto;flex:1}
      .aa-modal-actions{padding:.9rem 1.4rem;border-top:1px solid var(--border);display:flex;gap:.6rem;justify-content:flex-end;flex-wrap:wrap;background:var(--card)}
      .aa-field{margin-bottom:.9rem}
      .aa-field label{display:block;font-size:.78rem;font-weight:600;color:var(--text);margin-bottom:.35rem}
      .aa-field input, .aa-field select, .aa-field textarea{width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:.7rem .9rem;border-radius:8px;font-family:inherit;font-size:16px;transition:border-color .2s;min-height:44px}
      .aa-field input:focus, .aa-field select:focus, .aa-field textarea:focus{outline:none;border-color:var(--purple-light)}
      .aa-row2{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
      @media(max-width:560px){.aa-row2{grid-template-columns:1fr;gap:0}}
      .aa-team-pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.4rem;max-height:200px;overflow-y:auto;padding:.5rem;background:var(--bg2);border:1px solid var(--border);border-radius:8px}
      .aa-team-pick label{display:flex;gap:.5rem;align-items:center;cursor:pointer;padding:.4rem;border-radius:6px;font-size:.82rem;font-weight:500}
      .aa-team-pick label:hover{background:var(--card-hover)}
      .aa-btn{padding:.65rem 1.1rem;border-radius:8px;border:none;font-family:inherit;font-weight:600;font-size:.86rem;cursor:pointer;transition:all .2s;min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:.4rem}
      .aa-btn-primary{background:var(--purple);color:#fff;box-shadow:0 4px 12px rgba(124,58,237,.3)}
      .aa-btn-primary:hover{background:var(--purple-light);transform:translateY(-1px)}
      .aa-btn-secondary{background:var(--bg2);color:var(--text);border:1px solid var(--border)}
      .aa-btn-secondary:hover{background:var(--card-hover);border-color:var(--purple-light)}
      .aa-btn-danger{background:rgba(239,68,68,.15);color:#EF4444;border:1px solid rgba(239,68,68,.3)}
      .aa-btn:disabled{opacity:.5;cursor:not-allowed}

      .aa-csv-preview{font-size:.78rem;max-height:280px;overflow:auto;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:.7rem;font-family:'Space Grotesk',monospace}
      .aa-csv-preview table{width:100%;border-collapse:collapse}
      .aa-csv-preview th, .aa-csv-preview td{padding:.35rem .5rem;border-right:1px solid var(--border);white-space:nowrap}
      .aa-csv-preview th{background:var(--bg2);color:var(--purple-light);font-weight:600;font-size:.74rem;text-transform:uppercase;letter-spacing:.04em}

      .aa-mapping{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.6rem}
      .aa-mapping label{display:flex;flex-direction:column;font-size:.78rem;gap:.25rem}
      .aa-mapping select{padding:.55rem .65rem;font-size:.85rem}

      @media (max-width:600px){
        .aa-modal-bg{padding:.6rem}
        .aa-modal{max-height:96vh;border-radius:12px}
        .aa-modal-head, .aa-modal-body, .aa-modal-actions{padding-left:1rem;padding-right:1rem}
        .aa-mapping{grid-template-columns:1fr}
        .aa-modal-actions{flex-direction:column}
        .aa-modal-actions .aa-btn{width:100%}
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ============================================================
  // SVG line chart (no library)
  // ============================================================
  function renderSparklineChart(data, opts={}) {
    if (!data || !data.length) {
      return '<div style="text-align:center;padding:2rem;color:var(--muted)">No metrics yet — import a CSV to see the chart.</div>';
    }
    const w = 800, h = 240, padL = 60, padR = 24, padT = 24, padB = 36;
    const ww = w - padL - padR, hh = h - padT - padB;
    const xVals = data.map(d => new Date(d.date).getTime());
    const minX = Math.min(...xVals), maxX = Math.max(...xVals) || minX + 1;
    const series = opts.series || [
      { key:'spend',       label:'Spend',       color:'#A855F7' },
      { key:'conversions', label:'Conversions', color:'#22D88F' }
    ];
    let svg = `<svg viewBox="0 0 ${w} ${h}" class="aa-chart-svg" preserveAspectRatio="none">`;
    // grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padT + (hh / 4) * i;
      svg += `<line x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}" stroke="rgba(168,85,247,0.12)" stroke-width="1"/>`;
    }
    // for each series: scale Y independently
    series.forEach((s, idx) => {
      const yVals = data.map(d => Number(d[s.key] || 0));
      const maxY = Math.max(...yVals, 1);
      const xy = data.map((d, i) => {
        const x = padL + ((xVals[i] - minX) / (maxX - minX || 1)) * ww;
        const y = padT + hh - (yVals[i] / maxY) * hh;
        return [x, y];
      });
      const path = xy.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
      svg += `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round"/>`;
      // dots
      xy.forEach(p => {
        svg += `<circle cx="${p[0]}" cy="${p[1]}" r="2.5" fill="${s.color}"/>`;
      });
      // legend
      svg += `<rect x="${padL + idx * 130}" y="${h - 14}" width="10" height="3" fill="${s.color}"/>`;
      svg += `<text x="${padL + idx * 130 + 16}" y="${h - 11}" fill="rgba(168,85,247,0.85)" font-size="11" font-family="Inter,sans-serif">${escHtml(s.label)} (max ${fmtNum(maxY)})</text>`;
    });
    // x-axis: first / last date
    if (data.length) {
      svg += `<text x="${padL}" y="${h - 22}" fill="rgba(168,85,247,0.6)" font-size="10">${escHtml(data[0].date)}</text>`;
      svg += `<text x="${w - padR}" y="${h - 22}" fill="rgba(168,85,247,0.6)" font-size="10" text-anchor="end">${escHtml(data[data.length-1].date)}</text>`;
    }
    svg += `</svg>`;
    return svg;
  }

  // ============================================================
  // PUBLIC API: ADMIN VIEW
  // ============================================================
  async function renderAdminView(opts) {
    injectStyles();
    const { container, supabase } = opts;
    const root = typeof container === 'string' ? document.getElementById(container) : container;
    if (!root) return;

    root.innerHTML = `
      <div class="aa-toolbar">
        <select id="aaPlatformFilter">
          <option value="">All platforms</option>
          ${PLATFORMS.map(p => `<option value="${p.key}">${p.icon} ${escHtml(p.label)}</option>`).join('')}
        </select>
        <select id="aaClientFilter"><option value="">All clients</option></select>
        <input id="aaSearch" placeholder="Search account name…" />
        <div style="margin-left:auto"></div>
        <button class="aa-btn aa-btn-primary" id="aaAddBtn">+ New Ad Account</button>
      </div>
      <div id="aaList"><div class="aa-empty"><div class="aa-empty-icon">⏳</div>Loading…</div></div>
    `;

    // Load clients for filter + modal
    const { data: clients } = await supabase.from('clients').select('id,name').order('name');
    const clientOpts = (clients || []);
    document.getElementById('aaClientFilter').innerHTML =
      '<option value="">All clients</option>' +
      clientOpts.map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');

    async function loadAndRender() {
      const platform = document.getElementById('aaPlatformFilter').value;
      const clientId = document.getElementById('aaClientFilter').value;
      const search = document.getElementById('aaSearch').value.trim().toLowerCase();
      const list = document.getElementById('aaList');
      list.innerHTML = '<div class="aa-empty"><div class="aa-empty-icon">⏳</div>Loading…</div>';

      let q = supabase.from('ad_accounts_with_summary').select('*').order('updated_at',{ascending:false});
      if (platform) q = q.eq('platform', platform);
      if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) { list.innerHTML = `<div class="aa-empty">⚠️ ${escHtml(error.message)}</div>`; return; }
      let accounts = data || [];
      if (search) accounts = accounts.filter(a => (a.account_name||'').toLowerCase().includes(search) || (a.client_name||'').toLowerCase().includes(search));
      if (!accounts.length) {
        list.innerHTML = `<div class="aa-empty"><div class="aa-empty-icon">📊</div>No ad accounts yet — add one to get started.</div>`;
        return;
      }
      list.innerHTML = `<div class="aa-grid">${accounts.map(a => renderAccountCard(a, 'admin')).join('')}</div>`;
      list.querySelectorAll('[data-aa-id]').forEach(card => {
        card.addEventListener('click', () => openAdminDetail(card.dataset.aaId, supabase, root));
      });
    }

    document.getElementById('aaPlatformFilter').addEventListener('change', loadAndRender);
    document.getElementById('aaClientFilter').addEventListener('change', loadAndRender);
    document.getElementById('aaSearch').addEventListener('input', loadAndRender);
    document.getElementById('aaAddBtn').addEventListener('click', () => openAccountModal(null, supabase, () => loadAndRender(), clientOpts));
    loadAndRender();
  }

  function renderAccountCard(a, mode) {
    const p = PLATFORM_BY_KEY[a.platform] || PLATFORM_BY_KEY.other;
    return `
      <div class="aa-card" data-aa-id="${a.id}">
        <div class="aa-card-head">
          <div style="flex:1;min-width:0">
            <div class="aa-card-title">${escHtml(a.account_name)}</div>
            <div class="aa-card-client">${escHtml(a.client_name || '—')}</div>
          </div>
          ${platformBadge(a.platform)}
        </div>
        <div class="aa-card-kpis">
          <div>
            <div class="aa-kpi-num">${fmtCurrency(a.total_spend, a.currency)}</div>
            <div class="aa-kpi-lbl">Total Spend</div>
          </div>
          <div>
            <div class="aa-kpi-num">${fmtNum(a.total_conversions)}</div>
            <div class="aa-kpi-lbl">Conv.</div>
          </div>
          <div>
            <div class="aa-kpi-num">${a.total_spend > 0 ? (Number(a.total_revenue||0) / Number(a.total_spend)).toFixed(2) + '×' : '—'}</div>
            <div class="aa-kpi-lbl">ROAS</div>
          </div>
        </div>
        <div class="aa-card-foot">
          <span class="aa-status-pill aa-status-${a.status}">${escHtml(a.status)}</span>
          <span>${a.last_metric_date ? 'Last: ' + a.last_metric_date : 'No data yet'}</span>
        </div>
      </div>
    `;
  }

  // ============================================================
  // ACCOUNT MODAL — create/edit
  // ============================================================
  async function openAccountModal(accountId, supabase, onDone, clientOpts) {
    let existing = null;
    if (accountId) {
      const { data } = await supabase.from('ad_accounts').select('*').eq('id', accountId).single();
      existing = data;
    }
    const { data: teamMembers } = await supabase.from('team_members').select('id,full_name,role_title').eq('status','active').order('full_name');

    const modal = document.createElement('div');
    modal.className = 'aa-modal-bg';
    modal.innerHTML = `
      <div class="aa-modal">
        <div class="aa-modal-head">
          <div class="aa-modal-title">${accountId ? 'Edit' : 'New'} Ad Account</div>
          <button class="aa-modal-close" type="button">&times;</button>
        </div>
        <div class="aa-modal-body">
          <div class="aa-row2">
            <div class="aa-field">
              <label>Account name *</label>
              <input id="aaf_name" placeholder="e.g. SAMA Cape Town – Meta Main" value="${escHtml(existing?.account_name || '')}" required />
            </div>
            <div class="aa-field">
              <label>Platform *</label>
              <select id="aaf_platform" required>
                ${PLATFORMS.map(p => `<option value="${p.key}" ${existing?.platform===p.key?'selected':''}>${p.icon} ${escHtml(p.label)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="aa-row2">
            <div class="aa-field">
              <label>Client *</label>
              <select id="aaf_client" required>
                <option value="">Choose client…</option>
                ${(clientOpts || []).map(c => `<option value="${c.id}" ${existing?.client_id===c.id?'selected':''}>${escHtml(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="aa-field">
              <label>External Account ID</label>
              <input id="aaf_extid" placeholder="e.g. act_123456789" value="${escHtml(existing?.external_account_id || '')}" />
            </div>
          </div>
          <div class="aa-row2">
            <div class="aa-field">
              <label>Currency</label>
              <select id="aaf_currency">
                ${['USD','EGP','EUR','SAR','KWD','AED','ZAR'].map(c => `<option value="${c}" ${(existing?.currency||'USD')===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="aa-field">
              <label>Monthly Budget</label>
              <input id="aaf_budget" type="number" step="0.01" placeholder="3000" value="${existing?.monthly_budget || ''}" />
            </div>
          </div>
          <div class="aa-row2">
            <div class="aa-field">
              <label>Status</label>
              <select id="aaf_status">
                ${['active','paused','disconnected','archived'].map(s => `<option value="${s}" ${(existing?.status||'active')===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
            <div class="aa-field">
              <label>Integration</label>
              <select id="aaf_integration">
                <option value="manual_import" ${(existing?.integration_type||'manual_import')==='manual_import'?'selected':''}>📝 Manual entry</option>
                <option value="csv_import" ${existing?.integration_type==='csv_import'?'selected':''}>📥 CSV import</option>
                <option value="oauth" ${existing?.integration_type==='oauth'?'selected':''}>🔑 OAuth (coming soon)</option>
                <option value="api_token" ${existing?.integration_type==='api_token'?'selected':''}>🔐 API token (coming soon)</option>
                <option value="mcp" ${existing?.integration_type==='mcp'?'selected':''}>🔌 MCP (coming soon)</option>
              </select>
            </div>
          </div>
          <div class="aa-field">
            <label>Assigned media buyers / managers</label>
            <div class="aa-team-pick" id="aaf_team">
              ${(teamMembers || []).map(m => {
                const checked = (existing?.team_member_ids || []).includes(m.id);
                return `<label><input type="checkbox" value="${m.id}" ${checked?'checked':''}/> ${escHtml(m.full_name||'?')} <span style="opacity:.6;font-size:.7rem">· ${escHtml(m.role_title||'')}</span></label>`;
              }).join('') || '<span style="color:var(--muted);font-size:.8rem">No team members yet.</span>'}
            </div>
          </div>
          <div class="aa-field">
            <label>Notes</label>
            <textarea id="aaf_notes" rows="2" placeholder="Any context for the team…">${escHtml(existing?.notes || '')}</textarea>
          </div>
        </div>
        <div class="aa-modal-actions">
          ${accountId ? `<button class="aa-btn aa-btn-danger" id="aaf_delete">🗑️ Delete</button><div style="flex:1"></div>` : ''}
          <button class="aa-btn aa-btn-secondary" id="aaf_cancel">Cancel</button>
          <button class="aa-btn aa-btn-primary" id="aaf_save">${accountId ? 'Save' : 'Create'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('.aa-modal-close').onclick = close;
    modal.querySelector('#aaf_cancel').onclick = close;

    if (accountId) {
      modal.querySelector('#aaf_delete').onclick = async () => {
        if (!confirm('Delete this ad account? All metrics & imports under it will be removed.')) return;
        const { error } = await supabase.from('ad_accounts').delete().eq('id', accountId);
        if (error) { alert(error.message); return; }
        close(); onDone && onDone();
      };
    }

    modal.querySelector('#aaf_save').onclick = async () => {
      const name = modal.querySelector('#aaf_name').value.trim();
      const platform = modal.querySelector('#aaf_platform').value;
      const clientId = modal.querySelector('#aaf_client').value;
      if (!name || !clientId) { alert('Account name and client are required.'); return; }
      const teamIds = Array.from(modal.querySelectorAll('#aaf_team input[type=checkbox]:checked')).map(c => c.value);
      const payload = {
        account_name: name,
        platform,
        client_id: clientId,
        external_account_id: modal.querySelector('#aaf_extid').value.trim() || null,
        currency: modal.querySelector('#aaf_currency').value,
        monthly_budget: parseFloat(modal.querySelector('#aaf_budget').value) || null,
        status: modal.querySelector('#aaf_status').value,
        integration_type: modal.querySelector('#aaf_integration').value,
        team_member_ids: teamIds,
        notes: modal.querySelector('#aaf_notes').value.trim() || null,
        updated_at: new Date().toISOString()
      };
      let resp;
      if (accountId) resp = await supabase.from('ad_accounts').update(payload).eq('id', accountId);
      else resp = await supabase.from('ad_accounts').insert([payload]);
      if (resp.error) { alert(resp.error.message); return; }
      close(); onDone && onDone();
    };
  }

  // ============================================================
  // ACCOUNT DETAIL VIEW (admin / team)
  // ============================================================
  async function openAdminDetail(accountId, supabase, root) {
    root.innerHTML = `<div class="aa-empty"><div class="aa-empty-icon">⏳</div>Loading account…</div>`;
    const { data: account } = await supabase.from('ad_accounts_with_summary').select('*').eq('id', accountId).single();
    if (!account) { root.innerHTML = '<div class="aa-empty">Account not found.</div>'; return; }
    const { data: metrics } = await supabase.from('ad_account_metrics').select('*').eq('ad_account_id', accountId).order('date',{ascending:true}).limit(500);
    const { data: imports } = await supabase.from('ad_account_imports').select('*').eq('ad_account_id', accountId).order('created_at',{ascending:false}).limit(20);

    renderDetailUI(root, account, metrics || [], imports || [], 'admin', supabase);
  }

  function renderDetailUI(root, account, metrics, imports, mode, supabase) {
    const p = PLATFORM_BY_KEY[account.platform] || PLATFORM_BY_KEY.other;
    const totalSpend = metrics.reduce((s, m) => s + Number(m.spend || 0), 0);
    const totalImpressions = metrics.reduce((s, m) => s + Number(m.impressions || 0), 0);
    const totalClicks = metrics.reduce((s, m) => s + Number(m.clicks || 0), 0);
    const totalConv = metrics.reduce((s, m) => s + Number(m.conversions || 0), 0);
    const totalRev = metrics.reduce((s, m) => s + Number(m.conversion_value || 0), 0);
    const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + '%' : '—';
    const cpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '—';
    const cpa = totalConv > 0 ? (totalSpend / totalConv).toFixed(2) : '—';
    const roas = totalSpend > 0 ? (totalRev / totalSpend).toFixed(2) + '×' : '—';

    const chartData = metrics.map(m => ({ date: m.date, spend: Number(m.spend||0), conversions: Number(m.conversions||0) }));

    const canManage = (mode === 'admin' || mode === 'team');
    const canImport = canManage;

    root.innerHTML = `
      <button class="aa-btn aa-btn-secondary" id="aaBack" style="margin-bottom:1rem">← Back to accounts</button>
      <div class="aa-detail">
        <div class="aa-detail-head">
          <div>
            <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-bottom:.4rem">
              ${platformBadge(account.platform)}
              <span class="aa-status-pill aa-status-${account.status}">${escHtml(account.status)}</span>
            </div>
            <div class="aa-detail-title">${escHtml(account.account_name)}</div>
            <div class="aa-detail-sub">${escHtml(account.client_name || '')} ${account.external_account_id ? '· ' + escHtml(account.external_account_id) : ''}</div>
          </div>
          <div class="aa-detail-actions">
            ${canImport ? `<button class="aa-btn aa-btn-primary" id="aaImportBtn">📥 Import CSV</button>` : ''}
            ${canManage ? `<button class="aa-btn aa-btn-secondary" id="aaLogBtn">+ Log day</button>` : ''}
            ${mode === 'admin' ? `<button class="aa-btn aa-btn-secondary" id="aaEditBtn">✏️ Edit</button>` : ''}
          </div>
        </div>

        <div class="aa-kpi-grid">
          <div class="aa-kpi-card"><div class="aa-kpi-big">${fmtCurrency(totalSpend, account.currency)}</div><div class="aa-kpi-big-lbl">Total Spend</div></div>
          <div class="aa-kpi-card"><div class="aa-kpi-big">${fmtNum(totalImpressions)}</div><div class="aa-kpi-big-lbl">Impressions</div></div>
          <div class="aa-kpi-card"><div class="aa-kpi-big">${fmtNum(totalClicks)}</div><div class="aa-kpi-big-lbl">Clicks</div></div>
          <div class="aa-kpi-card"><div class="aa-kpi-big">${ctr}</div><div class="aa-kpi-big-lbl">CTR</div></div>
          <div class="aa-kpi-card"><div class="aa-kpi-big">${cpc}</div><div class="aa-kpi-big-lbl">CPC</div></div>
          <div class="aa-kpi-card"><div class="aa-kpi-big">${fmtNum(totalConv)}</div><div class="aa-kpi-big-lbl">Conversions</div></div>
          <div class="aa-kpi-card"><div class="aa-kpi-big">${cpa}</div><div class="aa-kpi-big-lbl">CPA</div></div>
          <div class="aa-kpi-card"><div class="aa-kpi-big">${roas}</div><div class="aa-kpi-big-lbl">ROAS</div></div>
        </div>

        <div class="aa-chart-wrap">
          <div style="font-size:.85rem;font-weight:600;color:var(--text);margin-bottom:.6rem">Spend & Conversions Over Time</div>
          ${renderSparklineChart(chartData)}
        </div>

        <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:1.2rem">
          <div>
            <div style="font-size:.85rem;font-weight:600;color:var(--text);margin-bottom:.6rem">Recent metrics (${metrics.length} entries)</div>
            ${metrics.length ? `
              <div style="overflow-x:auto"><table class="aa-table">
                <thead><tr><th>Date</th><th>Spend</th><th>Imp.</th><th>Clicks</th><th>Conv.</th><th>Rev.</th><th>Source</th></tr></thead>
                <tbody>${metrics.slice().reverse().slice(0, 30).map(m => `<tr>
                  <td>${escHtml(m.date)}</td>
                  <td>${fmtCurrency(m.spend, account.currency)}</td>
                  <td>${fmtNum(m.impressions)}</td>
                  <td>${fmtNum(m.clicks)}</td>
                  <td>${fmtNum(m.conversions)}</td>
                  <td>${fmtCurrency(m.conversion_value, account.currency)}</td>
                  <td><span style="font-size:.7rem;color:var(--muted)">${escHtml(m.source||'manual')}</span></td>
                </tr>`).join('')}</tbody>
              </table></div>
            ` : '<div class="aa-empty"><div class="aa-empty-icon">📊</div>No metrics yet.</div>'}
          </div>
          <div>
            <div style="font-size:.85rem;font-weight:600;color:var(--text);margin-bottom:.6rem">Recent imports</div>
            ${imports.length ? imports.map(i => `
              <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:.7rem;margin-bottom:.5rem;font-size:.8rem">
                <div style="font-weight:600;margin-bottom:.2rem">${escHtml(i.file_name || 'CSV import')}</div>
                <div style="color:var(--muted);font-size:.74rem">${escHtml(i.imported_by_name || 'Someone')} · ${new Date(i.created_at).toLocaleDateString()}</div>
                <div style="font-size:.74rem;margin-top:.3rem">
                  <span style="color:var(--green)">✓ ${i.rows_imported || 0}</span>
                  ${i.rows_skipped ? `<span style="color:var(--muted)"> · ${i.rows_skipped} skipped</span>` : ''}
                </div>
              </div>
            `).join('') : '<div style="color:var(--muted);font-size:.8rem">No imports yet.</div>'}
          </div>
        </div>
      </div>
    `;

    document.getElementById('aaBack').onclick = () => {
      if (mode === 'admin') renderAdminView({ container: root, supabase });
      else if (mode === 'team') renderTeamView({ container: root, supabase, currentTeamId: window._aa_currentTeamId });
      else if (mode === 'client') renderClientView({ container: root, supabase, clientId: window._aa_currentClientId });
    };
    if (mode === 'admin') {
      document.getElementById('aaEditBtn').onclick = async () => {
        const { data: clients } = await supabase.from('clients').select('id,name').order('name');
        openAccountModal(account.id, supabase, () => openAdminDetail(account.id, supabase, root), clients || []);
      };
    }
    if (canImport) {
      document.getElementById('aaImportBtn').onclick = () => openImportModal(account, supabase, () => {
        if (mode === 'admin') openAdminDetail(account.id, supabase, root);
        else if (mode === 'team') openTeamDetail(account.id, supabase, root, window._aa_currentTeamId);
      });
    }
    if (canManage) {
      document.getElementById('aaLogBtn').onclick = () => openLogDayModal(account, supabase, () => {
        if (mode === 'admin') openAdminDetail(account.id, supabase, root);
        else if (mode === 'team') openTeamDetail(account.id, supabase, root, window._aa_currentTeamId);
      });
    }
  }

  // ============================================================
  // CSV IMPORT MODAL
  // ============================================================
  function openImportModal(account, supabase, onDone) {
    const modal = document.createElement('div');
    modal.className = 'aa-modal-bg';
    modal.innerHTML = `
      <div class="aa-modal" style="max-width:780px">
        <div class="aa-modal-head">
          <div class="aa-modal-title">📥 Import CSV — ${escHtml(account.account_name)}</div>
          <button class="aa-modal-close" type="button">&times;</button>
        </div>
        <div class="aa-modal-body">
          <div style="font-size:.85rem;color:var(--muted);margin-bottom:.8rem;line-height:1.6">
            Export your campaign data from <b>${escHtml(PLATFORM_BY_KEY[account.platform]?.label || 'the platform')}</b> as CSV (with daily breakdown), then upload it here. Common platforms tested: Meta Ads Manager, Google Ads, TikTok Ads.
          </div>
          <div class="aa-field">
            <label>CSV file *</label>
            <input id="aaCsvFile" type="file" accept=".csv,.txt,text/csv" />
          </div>
          <div id="aaCsvStep2" style="display:none">
            <div class="aa-field">
              <label>Map columns (auto-detected — review and adjust)</label>
              <div class="aa-mapping" id="aaCsvMapping"></div>
            </div>
            <div class="aa-field">
              <label>Preview (first 5 rows)</label>
              <div class="aa-csv-preview" id="aaCsvPreview"></div>
            </div>
          </div>
        </div>
        <div class="aa-modal-actions">
          <button class="aa-btn aa-btn-secondary" id="aaCsvCancel">Cancel</button>
          <button class="aa-btn aa-btn-primary" id="aaCsvImport" disabled>Import</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('.aa-modal-close').onclick = close;
    modal.querySelector('#aaCsvCancel').onclick = close;

    let parsedRows = null;
    let headers = null;
    let mapping = {};
    let fileName = '';

    modal.querySelector('#aaCsvFile').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      fileName = file.name;
      try {
        const text = await file.text();
        const rows = parseCSV(text);
        if (rows.length < 2) { alert('CSV looks empty.'); return; }
        headers = rows[0];
        parsedRows = rows.slice(1);
        mapping = autoMapColumns(headers);
        renderMappingUI();
        modal.querySelector('#aaCsvImport').disabled = false;
        modal.querySelector('#aaCsvStep2').style.display = '';
      } catch (err) {
        alert('Failed to parse CSV: ' + err.message);
      }
    };

    function renderMappingUI() {
      const fields = ['date','spend','impressions','reach','clicks','link_clicks','conversions','conversion_value','video_views','engagements','campaign_name','ad_set_name'];
      const fieldLabels = {
        date:'Date *', spend:'Spend *', impressions:'Impressions', reach:'Reach', clicks:'Clicks', link_clicks:'Link Clicks',
        conversions:'Conversions', conversion_value:'Revenue / Conversion Value', video_views:'Video Views',
        engagements:'Engagements', campaign_name:'Campaign Name', ad_set_name:'Ad Set'
      };
      modal.querySelector('#aaCsvMapping').innerHTML = fields.map(f => `
        <label>${fieldLabels[f]}
          <select data-field="${f}">
            <option value="">— ignore —</option>
            ${headers.map((h, i) => `<option value="${i}" ${mapping[f]===i?'selected':''}>${escHtml(h)}</option>`).join('')}
          </select>
        </label>
      `).join('');
      modal.querySelectorAll('#aaCsvMapping select').forEach(sel => {
        sel.onchange = () => {
          const v = sel.value;
          if (v === '') delete mapping[sel.dataset.field];
          else mapping[sel.dataset.field] = parseInt(v);
        };
      });
      // Preview table
      modal.querySelector('#aaCsvPreview').innerHTML = `
        <table>
          <thead><tr>${headers.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>${parsedRows.slice(0,5).map(r => `<tr>${r.map(c => `<td>${escHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      `;
    }

    modal.querySelector('#aaCsvImport').onclick = async () => {
      if (mapping.date === undefined || mapping.spend === undefined) {
        alert('Please map at least Date and Spend columns.');
        return;
      }
      const btn = modal.querySelector('#aaCsvImport');
      btn.disabled = true; btn.textContent = '⏳ Importing…';

      // Build metric rows
      const out = [];
      let skipped = 0;
      let dateRange = { start: null, end: null };
      let totalSpend = 0;

      parsedRows.forEach(r => {
        const d = parseDateValue(r[mapping.date]);
        if (!d) { skipped++; return; }
        const spend = parseNumericValue(r[mapping.spend]);
        const row = {
          ad_account_id: account.id,
          date: d,
          spend,
          impressions: mapping.impressions !== undefined ? parseNumericValue(r[mapping.impressions]) : 0,
          reach: mapping.reach !== undefined ? parseNumericValue(r[mapping.reach]) : 0,
          clicks: mapping.clicks !== undefined ? parseNumericValue(r[mapping.clicks]) : 0,
          link_clicks: mapping.link_clicks !== undefined ? parseNumericValue(r[mapping.link_clicks]) : 0,
          conversions: mapping.conversions !== undefined ? parseNumericValue(r[mapping.conversions]) : 0,
          conversion_value: mapping.conversion_value !== undefined ? parseNumericValue(r[mapping.conversion_value]) : 0,
          video_views: mapping.video_views !== undefined ? parseNumericValue(r[mapping.video_views]) : 0,
          engagements: mapping.engagements !== undefined ? parseNumericValue(r[mapping.engagements]) : 0,
          campaign_name: mapping.campaign_name !== undefined ? String(r[mapping.campaign_name]||'').trim() || null : null,
          ad_set_name: mapping.ad_set_name !== undefined ? String(r[mapping.ad_set_name]||'').trim() || null : null,
          source: 'csv_import'
        };
        out.push(row);
        totalSpend += spend;
        if (!dateRange.start || d < dateRange.start) dateRange.start = d;
        if (!dateRange.end || d > dateRange.end) dateRange.end = d;
      });

      if (!out.length) {
        alert('No valid rows could be parsed. Check the date column.');
        btn.disabled = false; btn.textContent = 'Import';
        return;
      }

      // Insert metrics in batches of 200 to avoid payload limits
      let inserted = 0;
      for (let i = 0; i < out.length; i += 200) {
        const slice = out.slice(i, i + 200);
        const { error } = await supabase.from('ad_account_metrics').insert(slice);
        if (error) {
          alert('Insert failed at batch ' + (i/200+1) + ': ' + error.message);
          break;
        }
        inserted += slice.length;
      }

      // Get current user info for log
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      let importerName = sess?.session?.user?.email || 'Unknown';
      if (uid) {
        const { data: tm } = await supabase.from('team_members').select('full_name').eq('auth_user_id', uid).single();
        if (tm?.full_name) importerName = tm.full_name;
      }

      // Log the import
      await supabase.from('ad_account_imports').insert([{
        ad_account_id: account.id,
        imported_by: uid,
        imported_by_name: importerName,
        file_name: fileName,
        rows_imported: inserted,
        rows_skipped: skipped,
        date_range_start: dateRange.start,
        date_range_end: dateRange.end,
        total_spend: totalSpend,
        status: inserted === out.length ? 'success' : (inserted > 0 ? 'partial' : 'failed'),
        raw_columns: headers,
        column_mapping: mapping
      }]);

      // Update last_sync_at on account
      await supabase.from('ad_accounts').update({ last_sync_at: new Date().toISOString() }).eq('id', account.id);

      alert(`✅ Import complete!\n\n${inserted} rows imported${skipped ? ' · ' + skipped + ' skipped' : ''}\nDate range: ${dateRange.start} → ${dateRange.end}\nTotal spend imported: ${fmtCurrency(totalSpend, account.currency)}`);
      close();
      onDone && onDone();
    };
  }

  // ============================================================
  // LOG SINGLE DAY MODAL
  // ============================================================
  function openLogDayModal(account, supabase, onDone) {
    const today = new Date().toISOString().slice(0,10);
    const modal = document.createElement('div');
    modal.className = 'aa-modal-bg';
    modal.innerHTML = `
      <div class="aa-modal" style="max-width:520px">
        <div class="aa-modal-head">
          <div class="aa-modal-title">+ Log a Day's Numbers</div>
          <button class="aa-modal-close" type="button">&times;</button>
        </div>
        <div class="aa-modal-body">
          <div class="aa-row2">
            <div class="aa-field"><label>Date *</label><input id="logD" type="date" value="${today}" required/></div>
            <div class="aa-field"><label>Spend *</label><input id="logS" type="number" step="0.01" required/></div>
          </div>
          <div class="aa-row2">
            <div class="aa-field"><label>Impressions</label><input id="logI" type="number"/></div>
            <div class="aa-field"><label>Clicks</label><input id="logC" type="number"/></div>
          </div>
          <div class="aa-row2">
            <div class="aa-field"><label>Conversions</label><input id="logV" type="number"/></div>
            <div class="aa-field"><label>Revenue</label><input id="logR" type="number" step="0.01"/></div>
          </div>
          <div class="aa-field"><label>Notes</label><input id="logN" placeholder="optional"/></div>
        </div>
        <div class="aa-modal-actions">
          <button class="aa-btn aa-btn-secondary" id="logCancel">Cancel</button>
          <button class="aa-btn aa-btn-primary" id="logSave">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('.aa-modal-close').onclick = close;
    modal.querySelector('#logCancel').onclick = close;
    modal.querySelector('#logSave').onclick = async () => {
      const date = modal.querySelector('#logD').value;
      const spend = parseFloat(modal.querySelector('#logS').value);
      if (!date || isNaN(spend)) { alert('Date and Spend are required.'); return; }
      const payload = {
        ad_account_id: account.id, date, spend,
        impressions: parseFloat(modal.querySelector('#logI').value) || 0,
        clicks: parseFloat(modal.querySelector('#logC').value) || 0,
        conversions: parseFloat(modal.querySelector('#logV').value) || 0,
        conversion_value: parseFloat(modal.querySelector('#logR').value) || 0,
        notes: modal.querySelector('#logN').value.trim() || null,
        source: 'manual'
      };
      const { error } = await supabase.from('ad_account_metrics').insert([payload]);
      if (error) { alert(error.message); return; }
      close(); onDone && onDone();
    };
  }

  // ============================================================
  // TEAM VIEW
  // ============================================================
  async function renderTeamView(opts) {
    injectStyles();
    const { container, supabase, currentTeamId } = opts;
    window._aa_currentTeamId = currentTeamId;
    const root = typeof container === 'string' ? document.getElementById(container) : container;
    if (!root) return;

    root.innerHTML = `<div class="aa-empty"><div class="aa-empty-icon">⏳</div>Loading your accounts…</div>`;

    // Team RLS uses team_member_ids ? auth.uid mapping. We just select all (RLS filters).
    const { data: accounts, error } = await supabase
      .from('ad_accounts_with_summary')
      .select('*')
      .order('updated_at',{ascending:false});

    if (error) { root.innerHTML = `<div class="aa-empty">⚠️ ${escHtml(error.message)}</div>`; return; }
    if (!accounts || !accounts.length) {
      root.innerHTML = `<div class="aa-empty"><div class="aa-empty-icon">📊</div>No ad accounts assigned to you yet.<br/><span style="font-size:.85rem">Once an admin assigns you to one, you'll see it here.</span></div>`;
      return;
    }

    root.innerHTML = `
      <div class="aa-toolbar">
        <select id="aaPlatformFilter">
          <option value="">All platforms</option>
          ${PLATFORMS.map(p => `<option value="${p.key}">${p.icon} ${escHtml(p.label)}</option>`).join('')}
        </select>
        <input id="aaSearch" placeholder="Search…" />
      </div>
      <div id="aaList"><div class="aa-grid">${accounts.map(a => renderAccountCard(a, 'team')).join('')}</div></div>
    `;
    function refilter() {
      const platform = document.getElementById('aaPlatformFilter').value;
      const search = document.getElementById('aaSearch').value.trim().toLowerCase();
      const filtered = accounts.filter(a => (!platform || a.platform === platform) && (!search || (a.account_name||'').toLowerCase().includes(search) || (a.client_name||'').toLowerCase().includes(search)));
      document.getElementById('aaList').innerHTML = filtered.length ? `<div class="aa-grid">${filtered.map(a => renderAccountCard(a, 'team')).join('')}</div>` : '<div class="aa-empty">No matches.</div>';
      bindCards();
    }
    function bindCards() {
      root.querySelectorAll('[data-aa-id]').forEach(card => {
        card.onclick = () => openTeamDetail(card.dataset.aaId, supabase, root, currentTeamId);
      });
    }
    document.getElementById('aaPlatformFilter').onchange = refilter;
    document.getElementById('aaSearch').oninput = refilter;
    bindCards();
  }

  async function openTeamDetail(accountId, supabase, root, teamId) {
    root.innerHTML = `<div class="aa-empty"><div class="aa-empty-icon">⏳</div>Loading…</div>`;
    const { data: account } = await supabase.from('ad_accounts_with_summary').select('*').eq('id', accountId).single();
    if (!account) { root.innerHTML = '<div class="aa-empty">Not found.</div>'; return; }
    const { data: metrics } = await supabase.from('ad_account_metrics').select('*').eq('ad_account_id', accountId).order('date',{ascending:true}).limit(500);
    const { data: imports } = await supabase.from('ad_account_imports').select('*').eq('ad_account_id', accountId).order('created_at',{ascending:false}).limit(20);
    renderDetailUI(root, account, metrics || [], imports || [], 'team', supabase);
  }

  // ============================================================
  // CLIENT VIEW (read-only)
  // ============================================================
  async function renderClientView(opts) {
    injectStyles();
    const { container, supabase, clientId } = opts;
    window._aa_currentClientId = clientId;
    const root = typeof container === 'string' ? document.getElementById(container) : container;
    if (!root) return;

    root.innerHTML = `<div class="aa-empty"><div class="aa-empty-icon">⏳</div>Loading your ad accounts…</div>`;
    const { data: accounts, error } = await supabase
      .from('ad_accounts_with_summary')
      .select('*')
      .eq('client_id', clientId)
      .order('updated_at',{ascending:false});

    if (error) { root.innerHTML = `<div class="aa-empty">⚠️ ${escHtml(error.message)}</div>`; return; }
    if (!accounts || !accounts.length) {
      root.innerHTML = `<div class="aa-empty"><div class="aa-empty-icon">📊</div>No ad accounts connected yet.<br/><span style="font-size:.85rem">Your media buyer will set them up shortly.</span></div>`;
      return;
    }
    root.innerHTML = `<div class="aa-grid">${accounts.map(a => renderAccountCard(a, 'client')).join('')}</div>`;
    root.querySelectorAll('[data-aa-id]').forEach(card => {
      card.onclick = async () => {
        root.innerHTML = `<div class="aa-empty"><div class="aa-empty-icon">⏳</div>Loading…</div>`;
        const { data: account } = await supabase.from('ad_accounts_with_summary').select('*').eq('id', card.dataset.aaId).single();
        const { data: metrics } = await supabase.from('ad_account_metrics').select('*').eq('ad_account_id', card.dataset.aaId).order('date',{ascending:true}).limit(500);
        renderDetailUI(root, account, metrics || [], [], 'client', supabase);
      };
    });
  }

  // EXPORT
  window.AdAccounts = {
    renderAdminView,
    renderTeamView,
    renderClientView,
    PLATFORMS
  };
})();
