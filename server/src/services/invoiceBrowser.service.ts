/// <reference lib="dom" />
import { chromium, type Browser } from 'playwright';
import fs from 'node:fs';
import { INVOICE_WIDTH } from './invoiceHtml.service.js';

let browserPromise: Promise<Browser> | undefined;
async function browser() {
  if (!browserPromise) {
    const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || (process.platform === 'win32'
      ? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p)) : undefined);
    browserPromise = chromium.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    }).then(instance => {
      instance.on('disconnected', () => { browserPromise = undefined; });
      return instance;
    }).catch(error => { browserPromise = undefined; throw error; });
  }
  return browserPromise;
}

export async function renderInvoicePdf(html: string): Promise<Buffer> {
  const instance = await browser();
  const page = await instance.newPage({ viewport: { width: Math.ceil(INVOICE_WIDTH), height: 900 }, deviceScaleFactor: 1 });
  try {
    await page.route('**/*', route => route.abort());
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map(image => image.decode()));
    });
    const height = await page.evaluate(() => document.querySelector('main')!.getBoundingClientRect().height);
    if (height > 19000) throw new Error('This invoice is too long for a single PDF page. Split it into smaller invoices.');
    await page.addStyleTag({ content: `@page{size:${INVOICE_WIDTH}px ${height}px;}` });
    return await page.pdf({ preferCSSPageSize: true, width: `${INVOICE_WIDTH}px`, height: `${height}px`, printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
  } finally {
    await page.close();
  }
}

export async function closeInvoiceBrowser() {
  if (browserPromise) await (await browserPromise).close();
  browserPromise = undefined;
}
