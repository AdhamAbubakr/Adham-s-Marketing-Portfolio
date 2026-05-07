/* =============================================================================
   Barkar — Contract PDF Generator (HTML → Canvas → PDF)
   Uses html2canvas to render an HTML template (with full Arabic + RTL support
   via Google Fonts Cairo) and packages each page slice with jsPDF.
   ========================================================================== */

(function(){
  // BARKAR brand constants
  const BRAND = {
    name: 'Barkar',
    fullName: 'Barkar Digital Marketing Agency',
    representative: 'Adham Abo Bakr SalahElden',
    title: 'Founder & CEO',
    nationalId: '30108011329691',
    email: 'info@barkar.net',
    phone: '+20 104 472 4144',
    website: 'barkar.net',
    address: 'Egypt — Operating across MENA & Africa'
  };

  // ============================================================
  // Default services menu (admin can override per contract)
  // ============================================================
  window.BARKAR_SERVICES = [
    { key: 'social_media', icon: '📱', label: 'Social Media Management',  desc: 'Content strategy, calendar, community, growth' },
    { key: 'paid_ads',     icon: '🎯', label: 'Paid Ads & Performance',   desc: 'Meta, Google, TikTok ads — full-funnel' },
    { key: 'ecommerce',    icon: '🛒', label: 'E-commerce Website Design', desc: 'Shopify / WordPress / WooCommerce' },
    { key: 'content',      icon: '🎨', label: 'Content & Creative Design', desc: 'Graphics, video editing, brand identity' },
    { key: 'crm',          icon: '🤖', label: 'CRM & Marketing Automation', desc: 'Zoho, N8N, chatbots, lead pipelines' },
    { key: 'analytics',    icon: '📊', label: 'Analytics & Reporting',     desc: 'GA4, dashboards, weekly KPIs' },
    { key: 'seo',          icon: '🔍', label: 'SEO & Search Visibility',   desc: 'Technical SEO, content, link building' },
    { key: 'strategy',     icon: '🧠', label: 'Marketing Strategy',        desc: 'Discovery, positioning, channel mix' }
  ];

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ============================================================
  // Build the contract HTML — uses dir="auto" wherever the value
  // could be Arabic so the browser handles RTL automatically.
  // ============================================================
  function buildContractHTML(contract) {
    const services = (contract.services && contract.services.length) ? contract.services : window.BARKAR_SERVICES;
    const issuedDate = contract.issued_date || new Date().toLocaleDateString('en-GB');
    const clientName = contract.client_full_name || contract.client_default_name || '__________________________';
    const clientEmail = contract.client_email || '__________________________';
    const businessName = contract.business_name || '';

    const clauses = [
      ['1. Scope of Work', 'Barkar will deliver the services ticked above according to the agreed deliverables, timelines, and KPIs documented in the project brief and strategy.'],
      ['2. Term & Renewal', 'This agreement begins on the date both parties sign and continues for the period specified, renewing monthly (for retainers) unless either party gives 30 days written notice.'],
      ['3. Fees & Payment', 'Fees are payable in advance for retainers, or per milestone for project work. Late payments beyond 14 days may pause active deliverables until settled.'],
      ['4. Client Obligations', 'Client agrees to provide assets, approvals, and access (ad accounts, social profiles, hosting) within 5 business days of request to keep the project on schedule.'],
      ['5. Confidentiality', 'Both parties shall keep proprietary information, strategies, performance data, and brand materials strictly confidential during and after this engagement.'],
      ['6. Intellectual Property', 'All deliverables produced under this agreement become the property of the Client upon full payment. Barkar retains the right to display work in its portfolio unless restricted in writing.'],
      ['7. Performance', 'Barkar commits to best efforts but does not guarantee specific revenue, ranking, or growth outcomes, as paid platforms and consumer behavior involve variables beyond our control.'],
      ['8. Termination', 'Either party may terminate this agreement with 30 days written notice. Outstanding deliverables and earned fees up to termination date remain payable.'],
      ['9. Liability', 'Barkar liability under this agreement is capped at the total fees paid in the three months preceding any claim. Neither party is liable for indirect or consequential damages.'],
      ['10. Governing Law', 'This agreement is governed by the laws of the Arab Republic of Egypt. Disputes will be resolved through good-faith negotiation, then arbitration if needed.']
    ];

    const totalValueText = contract.total_value
      ? `${escHtml(contract.currency || 'USD')} ${Number(contract.total_value).toLocaleString()}`
      : 'To be quoted upon scope confirmation';

    return `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&family=Caveat:wght@500;700&display=swap');
  .ctr-page, .ctr-page * { box-sizing: border-box; margin: 0; padding: 0; }
  .ctr-page {
    font-family: 'Inter', 'Cairo', system-ui, sans-serif;
    color: #1c1130; background: #ffffff; width: 794px; line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .ctr-page [dir="rtl"], .ctr-page [dir="auto"]:lang(ar) { font-family: 'Cairo', 'Inter', sans-serif; }

  /* ----- HEADER ----- */
  .ctr-header {
    background: #7C3AED; padding: 28px 40px; color: #fff;
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 6px solid #EC4899;
  }
  .ctr-brand-line { display: flex; align-items: center; gap: 14px; }
  .ctr-logo {
    width: 56px; height: 56px; background: #fff; border-radius: 12px;
    color: #7C3AED; font-weight: 800; font-size: 32px;
    display: flex; align-items: center; justify-content: center; position: relative;
  }
  .ctr-logo::after {
    content: ''; position: absolute; top: 8px; right: 8px;
    width: 8px; height: 8px; background: #EC4899; border-radius: 50%;
  }
  .ctr-brand-name { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
  .ctr-brand-tag { font-size: 12px; opacity: 0.92; margin-top: 4px; }
  .ctr-meta-right { text-align: right; }
  .ctr-meta-right .lbl { font-size: 11px; opacity: 0.85; }
  .ctr-meta-right .val { font-size: 18px; font-weight: 700; margin-top: 2px; }
  .ctr-meta-right .date { font-size: 11px; opacity: 0.85; margin-top: 4px; }

  /* ----- BODY ----- */
  .ctr-body { padding: 36px 50px 24px; }
  .ctr-title { font-size: 32px; font-weight: 800; text-align: center; letter-spacing: 1px; }
  .ctr-subtitle { font-size: 16px; color: #78788C; text-align: center; margin-top: 8px; font-weight: 500; }
  .ctr-divider {
    width: 60px; height: 3px;
    background: linear-gradient(90deg, #A855F7, #EC4899);
    margin: 14px auto 30px; border-radius: 2px;
  }

  .ctr-section { margin-top: 28px; }
  .ctr-h2 {
    color: #7C3AED; font-size: 13px; font-weight: 700; letter-spacing: 1.5px;
    margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #E5E5F0;
  }

  /* ----- PARTIES ----- */
  .ctr-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .ctr-party {
    background: #fafaff; border-left: 3px solid #7C3AED;
    padding: 14px 16px; border-radius: 0 8px 8px 0;
  }
  .ctr-party-label { font-size: 10px; color: #78788C; font-weight: 700; letter-spacing: 1px; margin-bottom: 8px; }
  .ctr-party-name { font-size: 16px; font-weight: 700; color: #1c1130; margin-bottom: 6px; }
  .ctr-party-detail { font-size: 12px; color: #555; margin-top: 3px; line-height: 1.6; }

  /* ----- SERVICES ----- */
  .ctr-tick-instr { font-size: 12px; color: #78788C; margin-bottom: 12px; }
  .ctr-services { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ctr-service {
    display: flex; gap: 10px; padding: 10px 12px;
    border: 1px solid #E5E5F0; border-radius: 8px; background: #fff;
  }
  .ctr-checkbox {
    width: 16px; height: 16px; border: 1.5px solid #1c1130;
    border-radius: 3px; flex-shrink: 0; margin-top: 2px;
  }
  .ctr-svc-label { font-size: 13px; font-weight: 700; color: #1c1130; }
  .ctr-svc-desc { font-size: 11px; color: #78788C; margin-top: 2px; line-height: 1.5; }

  /* ----- COMMERCIAL ----- */
  .ctr-total-box {
    background: linear-gradient(135deg, #f8f6fd, #fef0f8);
    border: 1px solid #d6c7ee; padding: 18px 22px; border-radius: 10px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .ctr-total-lbl { font-size: 11px; color: #78788C; }
  .ctr-total-val { font-size: 24px; font-weight: 800; color: #7C3AED; margin-top: 2px; }
  .ctr-total-side { text-align: right; font-size: 11px; color: #78788C; line-height: 1.7; }
  .ctr-total-side b { color: #1c1130; font-weight: 700; }

  /* ----- CLAUSES ----- */
  .ctr-clause { margin-bottom: 10px; }
  .ctr-clause-h { font-size: 12px; font-weight: 700; color: #1c1130; margin-bottom: 3px; }
  .ctr-clause-b { font-size: 11px; color: #555; line-height: 1.65; }

  /* ----- ACK + SIGS ----- */
  .ctr-ack-text { font-size: 13px; line-height: 1.75; color: #1c1130; margin-bottom: 18px; }
  .ctr-ack-instr { font-size: 12px; font-weight: 700; color: #1c1130; margin-bottom: 6px; }
  .ctr-ack-box { border: 1.5px solid #d0d0e0; border-radius: 8px; height: 100px; background: #fafaff; }

  .ctr-sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 26px; }
  .ctr-sig-label { font-size: 10px; color: #7C3AED; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 28px; }
  .ctr-sig-line { height: 1px; background: #cccdde; margin-bottom: 0; position: relative; }
  .ctr-sig-handwritten {
    font-family: 'Caveat', 'Brush Script MT', cursive;
    font-size: 32px; color: #7C3AED;
    position: absolute; left: 4px; bottom: -2px;
    font-weight: 600; line-height: 1; white-space: nowrap;
  }
  .ctr-sig-info { font-size: 11px; color: #555; margin-top: 16px; line-height: 1.85; }
  .ctr-sig-info b { color: #1c1130; font-weight: 700; }
  .ctr-sig-blank { font-family: 'Inter', monospace; color: #555; font-size: 11px; margin-top: 16px; line-height: 2.1; }

  /* ----- FOOTER ----- */
  .ctr-footer {
    background: #7C3AED; color: #fff; padding: 14px 40px;
    font-size: 11px; text-align: center; line-height: 1.7; margin-top: 36px;
  }
  .ctr-footer .small { font-size: 10px; opacity: 0.9; }
</style>

<div class="ctr-page">
  <div class="ctr-header">
    <div class="ctr-brand-line">
      <div class="ctr-logo">B</div>
      <div>
        <div class="ctr-brand-name">Barkar.</div>
        <div class="ctr-brand-tag">Digital Marketing Agency</div>
      </div>
    </div>
    <div class="ctr-meta-right">
      <div class="lbl">Contract No.</div>
      <div class="val">${escHtml(contract.contract_number || 'BARK-2026-XXXX')}</div>
      <div class="date">Issued: ${escHtml(issuedDate)}</div>
    </div>
  </div>

  <div class="ctr-body">
    <div class="ctr-title">SERVICE AGREEMENT</div>
    <div class="ctr-subtitle" dir="auto">${escHtml(contract.title || 'Marketing Services Retainer')}</div>
    <div class="ctr-divider"></div>

    <div class="ctr-section">
      <div class="ctr-h2">PARTIES</div>
      <div class="ctr-parties">
        <div class="ctr-party">
          <div class="ctr-party-label">PARTY A — SERVICE PROVIDER</div>
          <div class="ctr-party-name">${escHtml(BRAND.fullName)}</div>
          <div class="ctr-party-detail">Represented by: ${escHtml(BRAND.representative)}</div>
          <div class="ctr-party-detail">Title: ${escHtml(BRAND.title)}</div>
          <div class="ctr-party-detail">National ID: ${escHtml(BRAND.nationalId)}</div>
          <div class="ctr-party-detail">Email: ${escHtml(BRAND.email)}</div>
          <div class="ctr-party-detail">Phone: ${escHtml(BRAND.phone)}</div>
          <div class="ctr-party-detail">Address: ${escHtml(BRAND.address)}</div>
        </div>
        <div class="ctr-party">
          <div class="ctr-party-label">PARTY B — CLIENT</div>
          <div class="ctr-party-name" dir="auto">${escHtml(clientName)}</div>
          ${businessName ? `<div class="ctr-party-detail" dir="auto">Business: ${escHtml(businessName)}</div>` : ''}
          <div class="ctr-party-detail">Email: ${escHtml(clientEmail)}</div>
          <div class="ctr-party-detail">Phone: __________________________</div>
          <div class="ctr-party-detail">National ID: __________________________</div>
          <div class="ctr-party-detail">Address: __________________________</div>
        </div>
      </div>
    </div>

    <div class="ctr-section">
      <div class="ctr-h2">SERVICES SELECTED</div>
      <div class="ctr-tick-instr">Tick the services you would like Barkar to deliver under this agreement:</div>
      <div class="ctr-services">
        ${services.map(s => `
          <div class="ctr-service">
            <div class="ctr-checkbox"></div>
            <div>
              <div class="ctr-svc-label" dir="auto">${escHtml(s.label)}</div>
              <div class="ctr-svc-desc" dir="auto">${escHtml(s.desc || '')}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="ctr-section">
      <div class="ctr-h2">COMMERCIAL TERMS</div>
      <div class="ctr-total-box">
        <div>
          <div class="ctr-total-lbl">Total Contract Value</div>
          <div class="ctr-total-val">${totalValueText}</div>
        </div>
        <div class="ctr-total-side">
          <div>Type: <b>${escHtml((contract.type || 'retainer').toUpperCase())}</b></div>
          ${contract.expires_at ? `<div>Valid until: <b>${escHtml(contract.expires_at)}</b></div>` : ''}
        </div>
      </div>
    </div>

    <div class="ctr-section">
      <div class="ctr-h2">TERMS &amp; CONDITIONS</div>
      ${clauses.map(([h,b]) => `
        <div class="ctr-clause">
          <div class="ctr-clause-h">${escHtml(h)}</div>
          <div class="ctr-clause-b">${escHtml(b)}</div>
        </div>
      `).join('')}
      ${contract.clauses ? `
        <div class="ctr-clause">
          <div class="ctr-clause-h">Additional Terms</div>
          <div class="ctr-clause-b" dir="auto" style="white-space:pre-wrap">${escHtml(contract.clauses)}</div>
        </div>
      ` : ''}
    </div>

    <div class="ctr-section">
      <div class="ctr-h2">CLIENT ACKNOWLEDGMENT</div>
      <div class="ctr-ack-text" dir="auto">
        I, the undersigned, hereby confirm that I have read, understood, and agreed to enter into this service agreement with Barkar Digital Marketing Agency to receive the services I have ticked above. I acknowledge the commercial terms, terms &amp; conditions, and obligations set forth in this contract, and I authorize Barkar to commence work upon the receipt of this signed copy.
      </div>
      <div class="ctr-ack-instr">Hand-written declaration (state services agreed + your full name):</div>
      <div class="ctr-ack-box"></div>

      <div class="ctr-sigs">
        <div>
          <div class="ctr-sig-label">PARTY A — BARKAR</div>
          <div class="ctr-sig-line">
            <div class="ctr-sig-handwritten">${escHtml(BRAND.representative)}</div>
          </div>
          <div class="ctr-sig-info">
            <b>${escHtml(BRAND.representative)}</b><br/>
            ${escHtml(BRAND.title)}, Barkar<br/>
            National ID: ${escHtml(BRAND.nationalId)}<br/>
            Date: ${escHtml(issuedDate)}<br/>
            Signed digitally on behalf of Barkar
          </div>
        </div>
        <div>
          <div class="ctr-sig-label">PARTY B — CLIENT</div>
          <div class="ctr-sig-line"></div>
          <div class="ctr-sig-blank">
            Signature: __________________________<br/>
            Full Name: __________________________<br/>
            National ID: __________________________<br/>
            Date: __________________________
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="ctr-footer">
    <div>${escHtml(BRAND.fullName)} &nbsp;|&nbsp; ${escHtml(BRAND.email)} &nbsp;|&nbsp; ${escHtml(BRAND.website)}</div>
    <div class="small">This contract is generated electronically and is legally binding once signed by both parties.</div>
  </div>
</div>`;
  }

  // ============================================================
  // Generate PDF using HTML → Canvas → PDF pipeline
  // ============================================================
  window.generateContractPDF = async function(contract) {
    if (!window.jspdf || !window.html2canvas) {
      alert('PDF library not loaded. Please refresh and try again.');
      return null;
    }
    const { jsPDF } = window.jspdf;

    // Render HTML offscreen
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-99999px;top:0;width:794px;background:#fff;';
    container.innerHTML = buildContractHTML(contract);
    document.body.appendChild(container);

    // Force-load Cairo + Caveat at the weights we use, then wait for fonts.ready
    try {
      if (document.fonts && document.fonts.load) {
        await Promise.all([
          document.fonts.load('400 14px "Cairo"'),
          document.fonts.load('600 14px "Cairo"'),
          document.fonts.load('700 16px "Cairo"'),
          document.fonts.load('600 32px "Caveat"'),
          document.fonts.load('400 14px "Inter"'),
          document.fonts.load('700 14px "Inter"')
        ]);
        await document.fonts.ready;
      }
    } catch(_) { /* ignore */ }
    // Small extra delay so Webkit reliably swaps fonts before snapshot
    await new Promise(r => setTimeout(r, 350));

    // Capture
    const innerEl = container.querySelector('.ctr-page');
    const canvas = await window.html2canvas(innerEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
      width: 794
    });

    document.body.removeChild(container);

    // Build PDF — slice the long canvas across A4 pages
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const pdfWidth = 210, pdfHeight = 297;
    const usableH = 290; // leave 7mm at bottom for page numbers
    const imgRatio = canvas.height / canvas.width;
    const fullImgH = pdfWidth * imgRatio;
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    let positionY = 0;
    let pageCount = 0;
    while (positionY < fullImgH) {
      if (pageCount > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, -positionY, pdfWidth, fullImgH);
      // Cover the bottom strip with white so page numbers sit on clean background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, usableH, pdfWidth, pdfHeight - usableH, 'F');
      positionY += usableH;
      pageCount++;
    }

    // Page number overlays
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(120, 120, 140);
      pdf.text('Page ' + i + ' of ' + totalPages, pdfWidth - 8, pdfHeight - 3, { align: 'right' });
      if (contract.contract_number) pdf.text(contract.contract_number, 8, pdfHeight - 3);
    }

    return pdf;
  };

  // Convenience wrappers — both are async now
  window.downloadContractPDF = async function(contract, filename) {
    const doc = await window.generateContractPDF(contract);
    if (!doc) return;
    doc.save(filename || ('Barkar_Contract_' + (contract.contract_number || 'draft') + '.pdf'));
  };

  window.contractPDFBlob = async function(contract) {
    const doc = await window.generateContractPDF(contract);
    if (!doc) return null;
    return doc.output('blob');
  };
})();
