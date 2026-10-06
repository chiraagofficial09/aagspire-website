import { renderInvoicePdf } from './invoiceBrowser.service.js';

/**
 * Pre-renders invoice PDFs as soon as a preview snapshot is created, so the later
 * Download click can send the already-rendered file instantly. The PDF is rendered
 * from the exact same snapshot HTML that download would use, so output is unchanged.
 */

const TTL_MS = 60 * 60 * 1000; // matches InvoicePreview expiry
const MAX_ENTRIES = 15;

type Entry = { pdf: Promise<Buffer>; expiresAt: number; ownerKey: string };

const cache = new Map<string, Entry>();

function prune(now = Date.now()) {
  for (const [id, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(id);
  }
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export function prerenderInvoicePdf(previewId: string, ownerKey: string, html: string): void {
  // A newer preview from the same user/client replaces the older one (only the latest can be downloaded in the UI)
  for (const [id, entry] of cache) {
    if (entry.ownerKey === ownerKey) cache.delete(id);
  }

  const pdf = renderInvoicePdf(html);
  // Failed pre-renders are dropped; download falls back to a fresh render
  pdf.catch(() => cache.delete(previewId));

  cache.set(previewId, { pdf, expiresAt: Date.now() + TTL_MS, ownerKey });
  prune();
}

/** Returns the pre-rendered PDF for a preview (once), or undefined if not available. */
export function takePrerenderedPdf(previewId: string): Promise<Buffer> | undefined {
  prune();
  const entry = cache.get(previewId);
  if (!entry) return undefined;
  cache.delete(previewId);
  return entry.pdf;
}
