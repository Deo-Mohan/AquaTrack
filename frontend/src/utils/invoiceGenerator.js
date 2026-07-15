/**
 * AquaTrack Invoice HTML Generator
 * Generates a fully styled, professional print-ready invoice HTML page.
 */
export function generateInvoiceHTML(bill) {
  const logoUrl = `${window.location.origin}/logo.png`;
  const isPaid = bill.status === 'PAID';
  const ratePerLiter = bill.consumptionLiters
    ? (bill.amount / bill.consumptionLiters).toFixed(4)
    : '0.0000';
  const invoiceNumber = `#AQ-${String(bill.id).padStart(5, '0')}`;
  const generatedOn = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>AquaTrack Invoice ${invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      background: #ffffff;
      color: #1e293b;
      line-height: 1.5;
      font-size: 13px;
    }

    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 48px 52px;
      position: relative;
    }

    /* ---- WATERMARK ---- */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 120px;
      font-weight: 900;
      color: ${isPaid ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)'};
      letter-spacing: 12px;
      pointer-events: none;
      user-select: none;
      white-space: nowrap;
    }

    /* ---- HEADER ---- */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 22px;
      margin-bottom: 24px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-logo {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 12px;
    }

    .brand-logo-fallback {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 900;
      color: white;
    }

    .brand-text .name {
      font-size: 22px;
      font-weight: 900;
      color: #2563eb;
      letter-spacing: -0.5px;
    }

    .brand-text .tagline {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 2px;
    }

    .brand-text .reg-line {
      font-size: 9.5px;
      color: #94a3b8;
      margin-top: 3px;
      font-weight: 500;
    }

    .invoice-meta {
      text-align: right;
    }

    .invoice-meta .invoice-label {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 2px;
    }

    .invoice-meta .invoice-num {
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
      margin-top: 4px;
    }

    .badge {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 8px;
    }

    .badge-paid { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .badge-unpaid { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-overdue { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

    /* ---- AUTHORITY BANNER ---- */
    .authority-banner {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 22px;
      font-size: 10.5px;
      color: #475569;
    }

    .authority-banner .auth-title {
      font-weight: 700;
      color: #1e293b;
      font-size: 12px;
    }

    .authority-banner .auth-details {
      margin-top: 2px;
    }

    .authority-banner .cert-badge {
      font-size: 10px;
      color: #2563eb;
      font-weight: 700;
      border: 1.5px solid #2563eb;
      border-radius: 6px;
      padding: 3px 8px;
    }

    /* ---- PARTIES ---- */
    .parties {
      display: flex;
      justify-content: space-between;
      gap: 32px;
      margin-bottom: 22px;
    }

    .party {
      flex: 1;
    }

    .party-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #94a3b8;
      margin-bottom: 6px;
    }

    .party-name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }

    .party-detail {
      font-size: 11.5px;
      color: #64748b;
      margin-top: 2px;
    }

    /* ---- META GRID ---- */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 28px;
    }

    .meta-cell {
      padding: 12px 16px;
      border-right: 1px solid #e2e8f0;
    }

    .meta-cell:last-child { border-right: none; }

    .meta-cell-label {
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #94a3b8;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .meta-cell-value {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }

    /* ---- TABLE ---- */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    thead tr {
      background: #1e293b;
      color: #f8fafc;
    }

    thead th {
      padding: 12px 14px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    thead th:last-child { text-align: right; }

    tbody tr {
      border-bottom: 1px solid #f1f5f9;
    }

    tbody tr:hover { background: #f8fafc; }

    tbody td {
      padding: 14px;
      font-size: 13px;
      color: #334155;
    }

    tbody td:not(:first-child) { text-align: right; }

    /* ---- TOTALS ---- */
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
    }

    .totals-box {
      width: 300px;
      border-top: 2px solid #e2e8f0;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 7px 0;
      font-size: 12.5px;
      color: #64748b;
      border-bottom: 1px solid #f1f5f9;
    }

    .totals-row.grand {
      border-top: 2px solid #2563eb;
      border-bottom: none;
      padding-top: 12px;
      margin-top: 4px;
    }

    .totals-row.grand .label {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }

    .totals-row.grand .value {
      font-size: 22px;
      font-weight: 900;
      color: #2563eb;
    }

    /* ---- PAYMENT TERMS ---- */
    .terms {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 24px 0;
      font-size: 11px;
      color: #78350f;
    }

    .terms strong { font-weight: 700; }

    /* ---- FOOTER ---- */
    .footer {
      border-top: 1.5px solid #e2e8f0;
      padding-top: 22px;
      margin-top: 28px;
    }

    .footer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 18px;
    }

    .footer-block-label {
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .footer-block-value {
      font-size: 11.5px;
      color: #475569;
      line-height: 1.7;
    }

    .sig-line {
      border-top: 1.5px solid #1e293b;
      width: 160px;
      margin-top: 36px;
      padding-top: 6px;
      font-size: 10px;
      font-weight: 600;
      color: #334155;
    }

    .footer-bottom {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      background: #f8fafc;
      border-radius: 8px;
      padding: 10px;
      margin-top: 6px;
    }

    .generated-note {
      text-align: center;
      font-size: 9.5px;
      color: #cbd5e1;
      margin-top: 8px;
    }

    /* ---- CIRCULAR SEAL ---- */
    .seal-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: -10px;
      margin-bottom: 12px;
    }

    .seal-svg {
      opacity: 0.13;
      width: 120px;
      height: 120px;
    }

    /* ---- GENERATION BAR ---- */
    .gen-bar {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 14px;
      font-size: 10px;
      color: #64748b;
    }

    .gen-bar .gen-label {
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-size: 9px;
    }

    .gen-bar .gen-value {
      font-size: 11px;
      font-weight: 700;
      color: #1e293b;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 24px 32px; }
    }
  </style>
</head>
<body>

<div class="watermark">${isPaid ? 'PAID' : 'DUE'}</div>

<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="brand">
      <img
        src="${logoUrl}"
        alt="AquaTrack Logo"
        class="brand-logo"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
      />
      <div class="brand-logo-fallback" style="display:none;">A</div>
      <div class="brand-text">
        <div class="name">AquaTrack</div>
        <div class="tagline">Smart Water Utility Management System</div>
        <div class="reg-line">Reg. No: AQWMS/2024/GOV-0471 &nbsp;|&nbsp; GST: 27AAQCA9876B1ZM</div>
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-label">INVOICE</div>
      <div class="invoice-num">${invoiceNumber}</div>
      <div class="badge ${isPaid ? 'badge-paid' : (bill.status === 'OVERDUE' ? 'badge-overdue' : 'badge-unpaid')}">${bill.status}</div>
    </div>
  </div>

  <!-- AUTHORITY BANNER -->
  <div class="authority-banner">
    <div>
      <div class="auth-title">AquaTrack Water Authority &mdash; Official Bill Receipt</div>
      <div class="auth-details">Issued under the Water Utility Services Act &bull; Urban Housing &amp; Infrastructure Division</div>
    </div>
    <div>
      <div class="cert-badge">✔ ISO 9001:2015 CERTIFIED</div>
    </div>
  </div>

  <!-- PARTIES -->
  <div class="parties">
    <div class="party">
      <div class="party-label">Service Provider</div>
      <div class="party-name">AquaTrack Water Authority</div>
      <div class="party-detail">Community Water Utility Management Division</div>
      <div class="party-detail">Helpline: 1800-AQA-HELP (Toll Free)</div>
      <div class="party-detail">Email: support@aquatrack.in</div>
      <div class="party-detail">Website: www.aquatrack.in</div>
    </div>
    <div class="party" style="text-align: right;">
      <div class="party-label">Billed To</div>
      <div class="party-name">Resident &mdash; House ${bill.houseNumber}</div>
      ${bill.apartmentBlock ? `<div class="party-detail">Apartment Block: ${bill.apartmentBlock}</div>` : ''}
      <div class="party-detail">AquaTrack Consumer ID: AQ-USR-${String(bill.id).padStart(6, '0')}</div>
      <div class="party-detail">Meter No: MT${String(bill.id * 31 + 1007).padStart(8, '0')}</div>
      <div class="party-detail">Connection Type: Residential</div>
    </div>
  </div>

  <!-- META GRID -->
  <div class="meta-grid">
    <div class="meta-cell">
      <div class="meta-cell-label">Invoice Date</div>
      <div class="meta-cell-value">${bill.generatedDate || '—'}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-cell-label">Due Date</div>
      <div class="meta-cell-value">${bill.dueDate || '—'}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-cell-label">Consumption</div>
      <div class="meta-cell-value">${bill.consumptionLiters || 0} Liters</div>
    </div>
    <div class="meta-cell" style="border-right: none;">
      <div class="meta-cell-label">Rate / Liter</div>
      <div class="meta-cell-value">₹${ratePerLiter}</div>
    </div>
  </div>

  <!-- CHARGES TABLE -->
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:right;">Qty (Liters)</th>
        <th style="text-align:right;">Unit Rate (₹)</th>
        <th style="text-align:right;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>Water Utility Consumption Charge</strong><br/>
          <span style="font-size:11px;color:#94a3b8;">Period: ${bill.generatedDate || '—'} &mdash; ${bill.dueDate || '—'}</span>
        </td>
        <td>${bill.consumptionLiters || 0} L</td>
        <td>${ratePerLiter}</td>
        <td><strong>${Number(bill.amount).toFixed(2)}</strong></td>
      </tr>
      <tr>
        <td>Maintenance & Infrastructure Cess</td>
        <td>—</td>
        <td>—</td>
        <td>0.00</td>
      </tr>
      <tr>
        <td>GST / Service Tax (0% — Govt. Exempted)</td>
        <td>—</td>
        <td>0%</td>
        <td>0.00</td>
      </tr>
    </tbody>
  </table>

  <!-- TOTALS -->
  <div class="totals-wrapper">
    <div class="totals-box">
      <div class="totals-row">
        <span class="label">Subtotal</span>
        <span class="value">₹${Number(bill.amount).toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span class="label">Discount</span>
        <span class="value" style="color:#10b981;">₹0.00</span>
      </div>
      <div class="totals-row">
        <span class="label">Tax (GST @ 0%)</span>
        <span class="value">₹0.00</span>
      </div>
      <div class="totals-row grand">
        <span class="label">Total Payable</span>
        <span class="value">₹${Number(bill.amount).toFixed(2)}</span>
      </div>
    </div>
  </div>

  <!-- PAYMENT TERMS NOTICE -->
  <div class="terms">
    <strong>⚠ Payment Terms:</strong> This invoice is due on <strong>${bill.dueDate || 'the date indicated above'}</strong>. Late payment
    may result in a <strong>2% penalty surcharge</strong> per month and potential suspension of water supply.
    For disputes or queries, contact your Community Admin or call our helpline <strong>1800-AQA-HELP</strong>.
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-grid">
      <div>
        <div class="footer-block-label">Payment Methods Accepted</div>
        <div class="footer-block-value">
          UPI &bull; QR Scan &bull; Net Banking<br/>
          Cheque payable to: AquaTrack Water Authority<br/>
          Bank: State Water Utility Bank<br/>
          A/C: 00AQWU9087312 &bull; IFSC: AQUA0001234
        </div>
        <div class="sig-line">Authorized Signatory</div>
      </div>
      <div style="text-align: right;">
        <div class="footer-block-label">Important Notices</div>
        <div class="footer-block-value">
          &bull; Conserve water &mdash; report leaks immediately.<br/>
          &bull; Meter tampering is a punishable offence.<br/>
          &bull; Keep this receipt for your records.<br/>
          &bull; Duplicate bills: admin@aquatrack.in
        </div>
        <div style="margin-top: 14px; font-size: 10px; color: #94a3b8;">
          Verified & Issued by AquaTrack System<br/>
          <strong style="color: #1e293b;">${generatedOn}</strong>
        </div>
      </div>
    </div>

    <!-- CIRCULAR SEAL -->
    <div class="seal-wrapper">
      <svg class="seal-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <!-- Outer ring -->
        <circle cx="100" cy="100" r="95" fill="none" stroke="#2563eb" stroke-width="4"/>
        <!-- Inner ring -->
        <circle cx="100" cy="100" r="82" fill="none" stroke="#2563eb" stroke-width="1.5"/>
        <!-- Star decorations -->
        <circle cx="100" cy="8" r="3" fill="#2563eb"/>
        <circle cx="100" cy="192" r="3" fill="#2563eb"/>
        <circle cx="8" cy="100" r="3" fill="#2563eb"/>
        <circle cx="192" cy="100" r="3" fill="#2563eb"/>
        <!-- Curved top text: AQUATRACK WATER AUTHORITY -->
        <path id="topArc" fill="none"
          d="M 18,100 A 82,82 0 0,1 182,100"/>
        <text font-family="Arial" font-weight="800" font-size="14" fill="#1e293b" letter-spacing="2">
          <textPath href="#topArc" startOffset="5%">AQUATRACK WATER AUTHORITY</textPath>
        </text>
        <!-- Curved bottom text: date -->
        <path id="botArc" fill="none"
          d="M 18,100 A 82,82 0 0,0 182,100"/>
        <text font-family="Arial" font-size="11" fill="#1e293b" letter-spacing="1.5">
          <textPath href="#botArc" startOffset="12%">${bill.generatedDate || generatedOn}</textPath>
        </text>
        <!-- Center logo letter -->
        <text x="100" y="90" text-anchor="middle" font-family="Arial" font-weight="900" font-size="30" fill="#2563eb">A</text>
        <text x="100" y="110" text-anchor="middle" font-family="Arial" font-weight="700" font-size="10" fill="#1e293b" letter-spacing="1">OFFICIAL SEAL</text>
        <text x="100" y="124" text-anchor="middle" font-family="Arial" font-size="8" fill="#64748b">ISO 9001:2015</text>
      </svg>
    </div>

    <div class="footer-bottom">
      Thank you for your timely payment and contribution to a sustainable water future. &bull;
      <strong>AquaTrack Water Authority</strong> &bull; www.aquatrack.in &bull; Reg. No: AQWMS/2024/GOV-0471
    </div>

    <!-- GENERATION TIMESTAMP BAR -->
    <div class="gen-bar">
      <div>
        <div class="gen-label">Document Generated On</div>
        <div class="gen-value">${generatedOn}</div>
      </div>
      <div style="text-align:center;">
        <div class="gen-label">Invoice Reference</div>
        <div class="gen-value">${invoiceNumber}</div>
      </div>
      <div style="text-align:right;">
        <div class="gen-label">GSTIN</div>
        <div class="gen-value">27AAAAA0001A1ZU</div>
      </div>
    </div>

    <div class="generated-note">
      This is a computer-generated invoice and is legally valid without a physical signature. &bull;
      Verify at www.aquatrack.in/verify using Invoice ID ${invoiceNumber}
    </div>
  </div>

</div>
</body>
</html>
  `;
}

/**
 * Opens a new browser window, writes the invoice HTML, and triggers the print dialog.
 */
export function printInvoice(bill) {
  const html = generateInvoiceHTML(bill);
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) {
    alert('Please allow pop-ups for this site to print invoices.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600); // small delay for fonts to load
}
