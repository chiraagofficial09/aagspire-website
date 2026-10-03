import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { pdf } from 'pdf-to-img';
import sharp from 'sharp';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { renderInvoiceHtml, INVOICE_WIDTH } from '../dist/services/invoiceHtml.service.js';
import { renderInvoicePdf, closeInvoiceBrowser } from '../dist/services/invoiceBrowser.service.js';
import { allocateInvoicePayments } from '../dist/services/invoiceCalculations.service.js';

const sample = {
  invoiceNumber: 'INV-042', clientCode: 'CL042', clientName: 'Example Client',
  companyName: 'Example Design & Technology Private Limited', gstNumber: '24ABCDE1234F1Z5', statementDate: '02 Oct 2026',
  subtotal: 9000, taxPercent: 18, taxAmount: 1620, discountAmount: 120,
  totalRevenue: 10500, totalPaid: 2500, pendingBalance: 7500,
  projects: [{ projectCode: 'P1', projectName: 'Website design with a long project title that must wrap cleanly',
    projectValue: 9000, grossProjectValue: 10000, discountAmount: 1000, paidAmount: 2500, balance: 6500, status: 'in_process',
    subProjects: ['Responsive website layouts and carefully prepared content for desktop, tablet and mobile devices.', 'Literal text: <script>alert(1)</script> & client notes.'] }],
  deductions: [{ projectName: 'Adjustment with a deliberately long label that should wrap without touching the amount', amount: 500 }],
};

test('invoice allocation uses discounted net values and distributes linked overpayment once', () => {
  const projects = [{ _id: 'a', projectValue: 10000, discountAmount: 1000, startDate: '2026-01-01' }, { _id: 'b', projectValue: 5000, startDate: '2026-02-01' }];
  const paid = allocateInvoicePayments(projects, [{ projectId: 'a', amount: 10000 }, { amount: 500 }]);
  assert.equal(paid.get('a'), 9000);
  assert.equal(paid.get('b'), 1500);
});

test('shared invoice HTML escapes user text and preserves totals and all terms', () => {
  const html = renderInvoiceHtml(sample);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('₹9,000'));
  assert.ok(html.includes('₹7,500'));
  assert.ok(html.includes('Final files will be delivered only after 100% payment clearance.'));
  assert.ok(!html.includes('https://fonts.googleapis.com'));
});

test('Chromium preview and PDF have matching geometry with no clipped long content', async () => {
  const output = new URL('../node_modules/.cache/invoice-parity/', import.meta.url);
  await mkdir(output, { recursive: true });
  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || (process.platform === 'win32'
    ? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p)) : undefined);
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const page = await browser.newPage({ viewport: { width: Math.ceil(INVOICE_WIDTH), height: 900 }, deviceScaleFactor: 1 });
    const html = renderInvoiceHtml(sample);
    await page.setContent(html);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images).map(i => i.decode())); });
    const geometry = await page.evaluate(() => ({
      height: Math.ceil(document.querySelector('main').getBoundingClientRect().height),
      width: document.documentElement.scrollWidth,
      terms: document.querySelectorAll('.terms li').length,
      overflow: Array.from(document.querySelectorAll('td,.client-name,.summary-row')).some(e => e.scrollWidth > e.clientWidth + 1),
      columnStarts: Array.from(document.querySelectorAll('th')).map(e => (e.getBoundingClientRect().left + parseFloat(getComputedStyle(e).paddingLeft)) * .75),
      lastColumnRight: (() => { const cell = document.querySelector('th:last-child'); return cell.getBoundingClientRect().right - parseFloat(getComputedStyle(cell).paddingRight); })(),
      totalAmountRight: document.querySelector('.total > svg:not(.total-outline)').getBoundingClientRect().right,
      totalWidth: document.querySelector('.total').getBoundingClientRect().width,
      summaryRight: document.querySelector('.summary-row strong').getBoundingClientRect().right,
      amountsLeftAligned: Array.from(document.querySelectorAll('td.amount,th.amount')).every(e => getComputedStyle(e).textAlign === 'left'),
    }));
    assert.equal(geometry.width, Math.ceil(INVOICE_WIDTH));
    assert.equal(geometry.terms, 16);
    assert.equal(geometry.overflow, false);
    assert.equal(geometry.amountsLeftAligned, true);
    assert.ok(Math.abs(geometry.totalAmountRight - geometry.summaryRight) < 1);
    assert.ok(Math.abs(geometry.totalWidth - (232.9 * 4 / 3)) < 1.5);
    [57.8, 79.8, 315.8, 399.8, 483.8].forEach((x, i) => assert.ok(Math.abs(geometry.columnStarts[i] - x) < .1));
    assert.ok(Math.abs(geometry.lastColumnRight - 8 - geometry.summaryRight) < 1);
    const screenshot = await page.screenshot({ fullPage: true });
    await writeFile(new URL('preview.png', output), screenshot);
    await writeFile(new URL('preview.html', output), html);
    const bytes = await renderInvoicePdf(html);
    await writeFile(new URL('invoice.pdf', output), bytes);
    const document = await pdf(bytes, { scale: 4 / 3 });
    try {
      assert.equal(document.length, 1);
      const rendered = await document.getPage(1);
      await writeFile(new URL('pdf.png', output), rendered);
      const actual = await sharp(rendered).metadata();
      assert.ok(Math.abs(actual.width - INVOICE_WIDTH) <= 1);
      assert.ok(Math.abs(actual.height - geometry.height) <= 2);
      // PDF and browser font rasterization differ; compare at reduced resolution.
      const expectedPixels = await sharp(screenshot).resize(400, 900, { fit: 'fill' }).removeAlpha().raw().toBuffer();
      const actualPixels = await sharp(rendered).resize(400, 900, { fit: 'fill' }).removeAlpha().raw().toBuffer();
      let error = 0;
      for (let i = 0; i < expectedPixels.length; i++) error += Math.abs(expectedPixels[i] - actualPixels[i]);
      const averageError = error / expectedPixels.length;
      assert.ok(averageError < 3.5, `Visual difference too large: ${averageError}`);
      console.log(`Preview/PDF average pixel difference: ${averageError.toFixed(2)}/255; ${geometry.height}px document`);
    } finally { await document.destroy(); }
    // Large amounts must not move the columns or overlap adjacent content.
    await page.setContent(renderInvoiceHtml({ ...sample, projects: [100, 2000, 1124242, 1200].map((value, i) => ({ ...sample.projects[0], projectName: 'Project ' + i, subProjects: [], projectValue: value, grossProjectValue: value, discountAmount: 0 })) }));
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => Array.from(document.querySelectorAll('td')).some(e => e.scrollWidth > e.clientWidth + 1)), false);
    const starts = await page.locator('tbody tr').evaluateAll(rows => rows.map(row => Array.from(row.querySelectorAll('.amount')).map(cell => cell.getBoundingClientRect().left)));
    starts.forEach(row => assert.deepEqual(row, starts[0]));
    const longHtml = renderInvoiceHtml({ ...sample, projects: Array.from({ length: 25 }, (_, i) => ({ ...sample.projects[0], projectName: `Long project ${i + 1}`, subProjects: ['A long description '.repeat(15)] })) });
    await page.setContent(longHtml);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('tbody tr').count(), 25);
    assert.ok(await page.locator('footer').isVisible());
    const longPdf = await pdf(await renderInvoicePdf(longHtml));
    assert.equal(longPdf.length, 1);
    await longPdf.destroy();
  } finally { await browser.close(); await closeInvoiceBrowser(); }
});

// Measurements extracted from the supplied CorelDRAW PDF, in PDF points.
// Use the same 36 rows so content length cannot hide spacing regressions.
test('invoice reproduces reference positions and typography across 36 rows', async () => {
  const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/invoice-reference.json', import.meta.url), 'utf8'));
  try {
    const bytes = await renderInvoicePdf(renderInvoiceHtml(fixture));
    const doc = await getDocument({ data: new Uint8Array(bytes) }).promise;
    try {
      assert.equal(doc.numPages, 1);
      const page = await doc.getPage(1);
      assert.ok(Math.abs(page.view[2] - 595.2801) < .5);
      assert.ok(Math.abs(page.view[3] - 2187) < 1);
      const items = (await page.getTextContent()).items.filter(t => t.str.trim());
      const check = (label, x, top, size, tolerance = 1) => {
        const item = items.find(t => t.str === label);
        assert.ok(item, 'Missing text: ' + label);
        assert.ok(Math.abs(item.transform[4] - x) < tolerance, label + ' horizontal position');
        assert.ok(Math.abs(page.view[3] - item.transform[5] - top) < tolerance, label + ' baseline');
        assert.ok(Math.abs(Math.hypot(item.transform[2], item.transform[3]) - size) < .05, label + ' font size');
      };
      check('Invoice', 408.4841, 90.6239, 38);
      check('BILLED TO/CLIENT', 69.8, 166.5649, 7.5);
      check('02 Oct 2026', 473.5106, 184.6029, 8.5);
      check('NO.', 57.8, 234.5649, 7.5);
      check('PROJECT / DELIVERABLE', 79.8, 234.5649, 7.5);
      for (let i = 1; i <= 36; i++) check(String(i), 57.8, 264.6031 + (i - 1) * 32, 8.5);
      check('Combined Subtotal:', 321.8, 1431.6029, 8.5);
      check('Paid Money:', 321.8, 1449.6029, 8.5);
      // Requested adjustment: summary titles and Total box aligned with PRICE column.
      check('Total:', 321.8, 1485.6409, 9.5);
      check('TERMS AND CONDITIONS', 51.8, 1563.4641, 18);
      check('PHONE / WHATSAPP', 101.8001, 2053.5661, 7);
      check('EMAIL', 353.4401, 2053.5661, 7);
      check('Aagspire', 51.8, 2121.0851, 7.5);
    } finally { await doc.destroy(); }
  } finally { await closeInvoiceBrowser(); }
});
