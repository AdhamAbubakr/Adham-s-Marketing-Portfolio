/* =============================================================================
   Barkar — Contract PDF Generator (jsPDF based)
   Produces a professionally-branded contract PDF with:
   - Barkar header + contract number
   - Parties section (Barkar + Client)
   - Services as checkboxes (empty for client to tick)
   - Terms & clauses
   - Total value
   - Pre-printed Barkar signature
   - Empty client signature / ID / acknowledgment area
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
    address: 'Egypt — Operating across MENA & Africa',
    purple: [124, 58, 237],
    purpleLight: [168, 85, 247],
    magenta: [236, 72, 153],
    dark: [10, 1, 24],
    text: [28, 17, 48],
    muted: [120, 120, 140],
    border: [220, 220, 235],
    lightBg: [248, 246, 253]
  };

  // ============================================================
  // Default available services (admin can override per contract)
  // ============================================================
  window.BARKAR_SERVICES = [
    { key: 'social_media', label: 'Social Media Management',  desc: 'Content strategy, calendar, community, growth' },
    { key: 'paid_ads',     label: 'Paid Ads & Performance',   desc: 'Meta, Google, TikTok ads — full-funnel' },
    { key: 'ecommerce',    label: 'E-commerce Website Design', desc: 'Shopify / WordPress / WooCommerce' },
    { key: 'content',      label: 'Content & Creative Design', desc: 'Graphics, video editing, brand identity' },
    { key: 'crm',          label: 'CRM & Marketing Automation', desc: 'Zoho, N8N, chatbots, lead pipelines' },
    { key: 'analytics',    label: 'Analytics & Reporting',     desc: 'GA4, dashboards, weekly KPIs' },
    { key: 'seo',          label: 'SEO & Search Visibility',   desc: 'Technical SEO, content, link building' },
    { key: 'strategy',     label: 'Marketing Strategy',        desc: 'Discovery, positioning, channel mix' }
  ];

  // ============================================================
  // PDF Generator
  // ============================================================
  window.generateContractPDF = function(contract) {
    if (!window.jspdf) {
      alert('PDF library not loaded. Please refresh the page and try again.');
      return null;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const pageW = 210, pageH = 297, M = 18;
    let y = 0;

    // ===== PAGE 1: HEADER + COVER =====
    // Top color band
    doc.setFillColor(...BRAND.purple);
    doc.rect(0, 0, pageW, 38, 'F');
    // Magenta accent stripe
    doc.setFillColor(...BRAND.magenta);
    doc.rect(0, 38, pageW, 2, 'F');

    // Logo block (white square with B)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(M, 12, 16, 16, 2.5, 2.5, 'F');
    doc.setTextColor(...BRAND.purple);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('B', M + 8, 23, { align: 'center' });
    // Magenta dot
    doc.setFillColor(...BRAND.magenta);
    doc.circle(M + 14.5, 14.5, 1.1, 'F');

    // Brand name & tagline (white on purple)
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Barkar.', M + 22, 21);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Digital Marketing Agency', M + 22, 27);

    // Right side: contract number + date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Contract No.', pageW - M, 18, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(contract.contract_number || 'BARK-2026-XXXX', pageW - M, 24, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Issued: ' + (contract.issued_date || new Date().toLocaleDateString('en-GB')), pageW - M, 30, { align: 'right' });

    y = 52;

    // ===== TITLE =====
    doc.setTextColor(...BRAND.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('SERVICE AGREEMENT', pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.muted);
    doc.text(contract.title || 'Marketing Services Retainer', pageW / 2, y, { align: 'center' });
    y += 4;

    // Decorative divider
    doc.setDrawColor(...BRAND.purpleLight);
    doc.setLineWidth(0.6);
    doc.line(pageW / 2 - 15, y + 2, pageW / 2 + 15, y + 2);
    y += 12;

    // ===== PARTIES =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.purple);
    doc.text('PARTIES', M, y);
    y += 4;
    doc.setDrawColor(...BRAND.border);
    doc.setLineWidth(0.3);
    doc.line(M, y, pageW - M, y);
    y += 5;

    // Party 1: Barkar (left column)
    const colW = (pageW - M * 2 - 6) / 2;
    let yLeft = y, yRight = y;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    doc.text('PARTY A — SERVICE PROVIDER', M, yLeft);
    yLeft += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.text);
    doc.text(BRAND.fullName, M, yLeft);
    yLeft += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    doc.text('Represented by: ' + BRAND.representative, M, yLeft); yLeft += 4;
    doc.text('Title: ' + BRAND.title, M, yLeft); yLeft += 4;
    doc.text('National ID: ' + BRAND.nationalId, M, yLeft); yLeft += 4;
    doc.text('Email: ' + BRAND.email, M, yLeft); yLeft += 4;
    doc.text('Phone: ' + BRAND.phone, M, yLeft); yLeft += 4;
    doc.text('Address: ' + BRAND.address, M, yLeft); yLeft += 4;

    // Party 2: Client (right column)
    const xRight = M + colW + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    doc.text('PARTY B — CLIENT', xRight, yRight);
    yRight += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.text);
    doc.text(contract.client_full_name || contract.client_default_name || '__________________________', xRight, yRight);
    yRight += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    if (contract.business_name) { doc.text('Business: ' + contract.business_name, xRight, yRight); yRight += 4; }
    doc.text('Email: ' + (contract.client_email || '__________________________'), xRight, yRight); yRight += 4;
    doc.text('Phone: __________________________', xRight, yRight); yRight += 4;
    doc.text('National ID: __________________________', xRight, yRight); yRight += 4;
    doc.text('Address: __________________________', xRight, yRight); yRight += 4;

    y = Math.max(yLeft, yRight) + 8;

    // ===== SERVICES =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.purple);
    doc.text('SERVICES SELECTED', M, y);
    y += 4;
    doc.setDrawColor(...BRAND.border);
    doc.setLineWidth(0.3);
    doc.line(M, y, pageW - M, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    doc.text('Tick ☐ the services you would like Barkar to deliver under this agreement:', M, y);
    y += 6;

    const services = (contract.services && contract.services.length) ? contract.services : window.BARKAR_SERVICES;
    services.forEach((s) => {
      // Checkbox
      doc.setDrawColor(...BRAND.text);
      doc.setLineWidth(0.4);
      doc.rect(M, y - 3.5, 4, 4);
      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...BRAND.text);
      doc.text(s.label, M + 7, y);
      // Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...BRAND.muted);
      doc.text(s.desc || '', M + 7, y + 4);
      y += 9;
    });

    y += 4;

    // ===== COMMERCIAL TERMS =====
    if (y > 240) { doc.addPage(); y = M; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.purple);
    doc.text('COMMERCIAL TERMS', M, y);
    y += 4;
    doc.setDrawColor(...BRAND.border);
    doc.line(M, y, pageW - M, y);
    y += 6;

    // Highlighted total box
    doc.setFillColor(...BRAND.lightBg);
    doc.roundedRect(M, y, pageW - M * 2, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    doc.text('Total Contract Value', M + 5, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...BRAND.purple);
    const valueText = contract.total_value
      ? `${contract.currency || 'USD'} ${Number(contract.total_value).toLocaleString()}`
      : 'To be quoted upon scope confirmation';
    doc.text(valueText, M + 5, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    doc.text('Type: ' + (contract.type || 'retainer').toUpperCase(), pageW - M - 5, y + 7, { align: 'right' });
    if (contract.expires_at) {
      doc.text('Valid until: ' + contract.expires_at, pageW - M - 5, y + 13, { align: 'right' });
    }
    y += 24;

    // ===== TERMS & CONDITIONS =====
    if (y > 220) { doc.addPage(); y = M; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.purple);
    doc.text('TERMS & CONDITIONS', M, y);
    y += 4;
    doc.setDrawColor(...BRAND.border);
    doc.line(M, y, pageW - M, y);
    y += 6;

    const defaultClauses = [
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

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    defaultClauses.forEach(([heading, body]) => {
      if (y > 270) { doc.addPage(); y = M; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...BRAND.text);
      doc.text(heading, M, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...BRAND.muted);
      const lines = doc.splitTextToSize(body, pageW - M * 2);
      lines.forEach(line => {
        if (y > 278) { doc.addPage(); y = M; }
        doc.text(line, M, y);
        y += 3.8;
      });
      y += 2;
    });

    // Custom additional clauses if provided
    if (contract.clauses && contract.clauses.trim()) {
      if (y > 250) { doc.addPage(); y = M; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...BRAND.text);
      doc.text('Additional Terms', M, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...BRAND.muted);
      const lines = doc.splitTextToSize(contract.clauses, pageW - M * 2);
      lines.forEach(line => {
        if (y > 278) { doc.addPage(); y = M; }
        doc.text(line, M, y);
        y += 3.8;
      });
    }

    // ===== ACKNOWLEDGMENT + SIGNATURES (always on a fresh page) =====
    doc.addPage();
    y = M + 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.purple);
    doc.text('CLIENT ACKNOWLEDGMENT', M, y);
    y += 4;
    doc.setDrawColor(...BRAND.border);
    doc.line(M, y, pageW - M, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...BRAND.text);
    const ackPara = 'I, the undersigned, hereby confirm that I have read, understood, and agreed to enter into this service agreement with Barkar Digital Marketing Agency to receive the services I have ticked above. I acknowledge the commercial terms, terms & conditions, and obligations set forth in this contract, and I authorize Barkar to commence work upon the receipt of this signed copy.';
    const ackLines = doc.splitTextToSize(ackPara, pageW - M * 2);
    ackLines.forEach(line => { doc.text(line, M, y); y += 4.5; });
    y += 4;

    // Hand-written declaration box (client writes by hand)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...BRAND.muted);
    doc.text('Hand-written declaration (state services agreed + your full name):', M, y);
    y += 4;
    doc.setDrawColor(...BRAND.border);
    doc.setLineWidth(0.4);
    doc.rect(M, y, pageW - M * 2, 26);
    y += 32;

    // ============================================================
    // Two signature columns — careful layout, no overlaps
    // ============================================================
    const sigW = (pageW - M * 2 - 10) / 2;
    const xL  = M;                    // left column x
    const xR  = M + sigW + 10;        // right column x

    // Y-anchors for the whole block
    const labelY = y;                 // section labels (PARTY A / PARTY B)
    const sigBaseline = y + 16;       // baseline where the actual signature sits
    const lineY = y + 18;             // signature line just below the signature
    const infoY = y + 24;             // info text starts below the line

    // ---- COLUMN LABELS ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.purple);
    doc.text('PARTY A — BARKAR', xL, labelY);
    doc.text('PARTY B — CLIENT', xR, labelY);

    // ---- SIGNATURE LINES ----
    doc.setDrawColor(...BRAND.border);
    doc.setLineWidth(0.4);
    doc.line(xL, lineY, xL + sigW, lineY);
    doc.line(xR, lineY, xR + sigW, lineY);

    // ---- PARTY A: pre-printed signature sitting on the line ----
    doc.setFont('times', 'italic');
    doc.setFontSize(22);
    doc.setTextColor(...BRAND.purple);
    doc.text(BRAND.representative, xL + 4, sigBaseline);

    // Party A info block under the line
    let yA = infoY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.text);
    doc.text(BRAND.representative, xL, yA); yA += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text(BRAND.title + ', Barkar', xL, yA); yA += 4;
    doc.text('National ID: ' + BRAND.nationalId, xL, yA); yA += 4;
    doc.text('Date: ' + (contract.issued_date || new Date().toLocaleDateString('en-GB')), xL, yA); yA += 4;
    doc.text('Signed digitally on behalf of Barkar', xL, yA);

    // ---- PARTY B: empty fields under the line for client to fill in ----
    let yB = infoY;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text('Signature:    ____________________________', xR, yB); yB += 5;
    doc.text('Full Name:    ____________________________', xR, yB); yB += 5;
    doc.text('National ID:  ____________________________', xR, yB); yB += 5;
    doc.text('Date:         ____________________________', xR, yB);

    // Footer band
    const fy = pageH - 14;
    doc.setFillColor(...BRAND.purple);
    doc.rect(0, fy, pageW, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(BRAND.fullName + '  |  ' + BRAND.email + '  |  ' + BRAND.website, pageW / 2, fy + 6, { align: 'center' });
    doc.setFontSize(7);
    doc.text('This contract is generated electronically and is legally binding once signed by both parties.', pageW / 2, fy + 10, { align: 'center' });

    // Page numbers on every page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...BRAND.muted);
      doc.text('Page ' + i + ' of ' + totalPages, pageW - M, pageH - 4, { align: 'right' });
      if (i < totalPages) {
        doc.text(contract.contract_number || '', M, pageH - 4);
      }
    }

    return doc;
  };

  // Convenience: download the PDF
  window.downloadContractPDF = function(contract, filename) {
    const doc = window.generateContractPDF(contract);
    if (!doc) return;
    doc.save(filename || ('Barkar_Contract_' + (contract.contract_number || 'draft') + '.pdf'));
  };

  // Get PDF as Blob for upload
  window.contractPDFBlob = function(contract) {
    const doc = window.generateContractPDF(contract);
    if (!doc) return null;
    return doc.output('blob');
  };
})();
