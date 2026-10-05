import fs from 'node:fs';
import { ClientStatementPdfData, allTerms } from './clientStatementPdf.service.js';
import { PHONE_ICON_BUF, EMAIL_ICON_BUF } from '../assets/contactIconsBase64.js';

// Reference artwork is 595.2801 PDF points wide (72 pt = 96 CSS px).
export const INVOICE_WIDTH = 595.2801 * 4 / 3;
export function escapeInvoiceText(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
let assets: { regular: string; bold: string; logo: string } | undefined;
function invoiceAssets() {
  if (!assets) {
    const read = (file: string) => fs.readFileSync(new URL(`../assets/${file}`, import.meta.url)).toString('base64');
    assets = { regular: read('fonts/PlusJakartaSans-Regular.ttf'), bold: read('fonts/PlusJakartaSans-Bold.ttf'), logo: read('invoice-reference-logo.png') };
  }
  return assets;
}

/** The exact same standalone document is shown in the preview and printed by Chromium. */
export function renderInvoiceHtml(data: ClientStatementPdfData): string {
  const a = invoiceAssets();
  const esc = escapeInvoiceText;
  // SVG text gradients print reliably; CSS background-clip:text can become
  // solid rectangles in Chromium PDFs / PDF viewers.
  const gradientText = (text: string, id: string, width: number, height: number, size: number, right = false) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}pt" height="${height}pt" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(text)}"><defs><linearGradient id="${id}"><stop stop-color="#FF5A1F"/><stop offset="1" stop-color="#FFA05C"/></linearGradient></defs><text x="${right ? width : 0}" y="${size}" text-anchor="${right ? 'end' : 'start'}" font-family="Invoice" font-size="${size}" font-weight="700" fill="url(#${id})">${esc(text)}</text></svg>`;
  const summaryRow = (label: string, amount: string) => `<div class="summary-row"><span>${esc(label)}</span><strong>${esc(amount)}</strong></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=${INVOICE_WIDTH}">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline';">
  <title>Invoice ${esc(data.invoiceNumber)}</title><style>
  @font-face{font-family:Invoice;src:url(data:font/ttf;base64,${a.regular}) format('truetype');font-weight:400;font-display:block}
  @font-face{font-family:Invoice;src:url(data:font/ttf;base64,${a.bold}) format('truetype');font-weight:600 900;font-display:block}
  *{box-sizing:border-box}html,body{margin:0;padding:0;width:${INVOICE_WIDTH}px;background:#080808;color:#fff;font-family:Invoice,sans-serif;font-size:8.5pt;line-height:12pt;letter-spacing:0.02em;font-kerning:normal;font-feature-settings:"kern" 1;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .invoice{width:${INVOICE_WIDTH}px;padding:24.18pt 24.2pt 23.82pt 23.8pt}
  .sheet{padding:28pt 28pt 38.8pt;border-radius:16pt;background:#0b0b0b;outline:1.2pt solid #1f1f1f;outline-offset:-.6pt}
  header{height:70.6pt;position:relative;border-bottom:1pt solid #1e1e1e;margin-bottom:22pt}
  .logo{position:absolute;left:0;top:-4.18pt;width:146pt;height:56pt;display:block}h1{position:absolute;right:.76pt;top:.444pt;margin:0;font-size:38pt;font-weight:700;line-height:1}
  svg{display:block;flex-shrink:0}
  .client{background:#111;outline:.8pt solid #202020;border-radius:8pt;padding:13pt 18pt;display:grid;grid-template-columns:minmax(0,1fr) 124.419pt;gap:5pt 24pt;margin-bottom:20pt;align-items:start;min-height:56pt}
  .muted{color:#71717a}.eyebrow{color:#666;font-size:7.5pt;line-height:12pt;text-transform:uppercase;font-weight:700;letter-spacing:0.04em}.client-name{transform:translateY(-.85pt);letter-spacing:0.015em;font-size:11pt;line-height:13pt;font-weight:700;overflow-wrap:anywhere}
  .detail{transform:translateY(.85pt);display:flex;justify-content:space-between;gap:8pt;color:#888}.detail strong{max-width:90pt;text-align:right;overflow-wrap:anywhere;color:#fff}.invoice-date{font-weight:400}.gst{grid-column:1/-1;display:flex;justify-content:flex-end;padding-top:8pt;border-top:.8pt solid #1e1e1e}.gst .detail{width:180pt}
  table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed}th{text-align:left;height:22pt;padding:1.12pt 6pt 0;background:#111;color:#71717a;font-size:7.5pt;font-weight:700;line-height:10pt;letter-spacing:0.03em;border-bottom:.6pt solid #181818}th:first-child{border-radius:4pt 0 0 0}th:last-child{border-radius:0 4pt 0 0}td{height:32pt;padding:12.9pt 6pt 6.35pt;border-bottom:.4pt solid #131313;vertical-align:top;overflow-wrap:anywhere}
  td:first-child{padding-right:0;white-space:nowrap}td.amount,th.amount{text-align:left;white-space:nowrap}.project{font-weight:700;letter-spacing:0.02em}.subprojects{list-style:none;padding:0;margin:5pt 0 0;color:#d4d4d8;font-size:8pt;line-height:12pt}.subprojects li{display:flex;gap:5pt;margin-top:3pt}.bullet{color:#ff7d3e;font-weight:700;flex-shrink:0}.discount{color:#d4d4d8}
  .summary-wrap{margin-top:12pt;padding-top:14.8pt;display:flex;justify-content:flex-end}.summary{width:calc(100% - 258pt)}.summary-row{display:flex;align-items:baseline;justify-content:space-between;gap:12pt;min-height:18pt;line-height:12pt;color:#888;padding:0 12pt}.summary-row span{overflow-wrap:anywhere}.summary-row strong{min-width:76pt;color:#fff;text-align:right;flex-shrink:0;font-size:9.5pt}
  .total{width:100%;margin:8pt 0 0;position:relative;padding:0 12pt;border-radius:8pt;background:#1f1008;display:flex;justify-content:space-between;align-items:center;gap:12pt;height:34pt;font-size:9.5pt;font-weight:700}.total-outline{position:absolute;left:-.55pt;top:-.55pt;width:calc(100% + 1.1pt);height:calc(100% + 1.1pt);pointer-events:none}.tnc{text-align:right;color:#71717a;font-size:8pt;line-height:12pt;padding:4pt 12pt 0 0}
  .terms{margin-top:6pt;padding-top:24pt;border-top:.8pt solid #1e1e1e}h2{font-size:18pt;line-height:24pt;margin:0 0 12pt;font-weight:700;letter-spacing:0.02em}.terms ul{transform:translateY(-2pt);list-style:none;margin:0;padding:0}.terms li{position:relative;padding-left:20pt;padding-right:28pt;color:#d4d4d8;font-size:9.2pt;line-height:15.092pt;margin-bottom:8.5pt}.terms li:last-child{margin-bottom:0}.terms li .bullet{position:absolute;left:5.17pt;top:5.41pt;width:3.91pt;height:3.91pt;font-size:0}.terms li span:last-child{overflow-wrap:anywhere}
  .contacts{display:grid;grid-template-columns:1fr 1fr;gap:12pt;margin-top:24pt}.contact{display:flex;align-items:center;gap:10pt;padding:10pt 12pt;height:48pt;border-radius:10pt;background:#111;outline:.8pt solid #202020}.contact img{width:28pt;height:28pt}.contact small{color:#777;font-size:7pt;font-weight:700;line-height:10pt;letter-spacing:0.04em;display:block;margin-bottom:4pt}.contact strong{position:relative;top:-1.1pt;font-size:8.5pt;line-height:12pt}.contact a{color:#fff;text-decoration:none}
  footer{border-top:.8pt solid #1e1e1e;margin-top:22pt;padding-top:6.4pt;display:flex;justify-content:space-between;color:#71717a;font-size:7.5pt;line-height:12pt}
  footer span{transform:translateY(-.665pt)}
  @page{margin:0}header,.client,.summary,.contact,footer,.terms li{break-inside:avoid}
  </style></head><body><main class="invoice"><div class="sheet">
  <header><img class="logo" alt="Aagspire" src="data:image/png;base64,${a.logo}"><h1>${gradientText('Invoice', 'title-gradient', 140, 48, 38, true)}</h1></header>
  <section class="client"><span class="eyebrow muted">Billed To/Client</span><div class="detail"><span class="muted">Invoice No:</span><strong>${esc(data.invoiceNumber || '001')}</strong></div>
  <div class="client-name">${esc(data.companyName || data.clientName)}</div><div class="detail"><span class="muted">Invoice Date:</span><strong class="invoice-date">${esc(data.statementDate)}</strong></div>
  ${data.gstNumber ? `<div class="gst"><div class="detail"><span class="muted">GSTIN:</span>${gradientText(data.gstNumber, 'gst-gradient', 124, 14, 8.5, true)}</div></div>` : ''}</section>
  <table><colgroup><col style="width:22pt"><col style="width:236pt"><col style="width:84pt"><col style="width:84pt"><col></colgroup><thead><tr><th>NO.</th><th>PROJECT / DELIVERABLE</th><th class="amount">PRICE (₹)</th><th class="amount">DISCOUNT (₹)</th><th class="amount">TOTAL (₹)</th></tr></thead><tbody>
  ${data.projects.map((p, i) => `<tr><td class="muted">${i + 1}</td><td><div class="project">${esc(p.projectName)}</div>${p.subProjects?.length ? `<ul class="subprojects">${p.subProjects.map(s => `<li><span class="bullet">•</span><span>${esc(s)}</span></li>`).join('')}</ul>` : ''}</td><td class="amount"><strong>${money(p.grossProjectValue ?? p.projectValue)}</strong></td><td class="amount discount">${p.discountAmount ? `-${money(p.discountAmount)}` : '₹0'}</td><td class="amount"><strong>${money(p.projectValue)}</strong></td></tr>`).join('') || '<tr><td colspan="5">No deliverables selected.</td></tr>'}
  </tbody></table>
  <div class="summary-wrap"><section class="summary">
  ${summaryRow('Combined Subtotal:', money(data.subtotal ?? data.totalRevenue))}
  ${data.taxAmount && data.taxAmount > 0 ? summaryRow(`GST (${data.taxPercent}%):`, `+${money(data.taxAmount)}`) : ''}
  ${data.discountAmount && data.discountAmount > 0 ? summaryRow('Extra Special Discount:', `-${money(data.discountAmount)}`) : ''}
  ${summaryRow('Paid Money:', `-${money(data.totalPaid)}`)}
  ${(data.deductions || []).filter(d => d.amount > 0).map(d => summaryRow(`${(d.projectName || d.label || 'Project').replace(/:$/, '')}:`, `-${money(d.amount)}`)).join('')}
  <div class="total"><svg class="total-outline" viewBox="0 0 234 35.1" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="total-border"><stop stop-color="#ff5a1f"/><stop offset="1" stop-color="#ffa05c"/></linearGradient></defs><rect x=".55" y=".55" width="232.9" height="34" rx="8" fill="none" stroke="url(#total-border)" stroke-width="1.1"/></svg><span>Total:</span>${gradientText(money(data.pendingBalance), 'total-gradient', 150, 18, 12.5, true)}</div><div class="tnc">*T&amp;C apply.</div></section></div>
  <section class="terms"><h2>${gradientText('TERMS AND CONDITIONS', 'terms-gradient', 400, 24, 18)}</h2><ul>${allTerms.map((t, i) => `<li><span class="bullet" aria-hidden="true"><svg width="3.91pt" height="3.91pt" viewBox="0 0 3.91 3.91"><defs><linearGradient id="bullet-${i}"><stop stop-color="#ffa05c"/><stop offset="1" stop-color="#ff5a1f"/></linearGradient></defs><circle cx="1.955" cy="1.955" r="1.955" fill="url(#bullet-${i})"/></svg></span><span>${esc(t)}</span></li>`).join('')}</ul></section>
  <section class="contacts"><div class="contact"><img alt="" src="data:image/png;base64,${PHONE_ICON_BUF.toString('base64')}"><div><small>PHONE / WHATSAPP</small><strong>+91 90812 50040</strong></div></div>
  <div class="contact"><img alt="" src="data:image/png;base64,${EMAIL_ICON_BUF.toString('base64')}"><div><small>EMAIL</small><strong><a href="mailto:aagspire@gmail.com">aagspire@gmail.com</a></strong></div></div></section>
  <footer><span>Aagspire</span><span>End of Agreement</span></footer></div></main></body></html>`;
}
