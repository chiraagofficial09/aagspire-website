import type { Response } from 'express';
import { InvoiceCounter } from '../models/InvoiceCounter.js';
import { Client } from '../models/Client.js';
import type { ClientStatementPdfData } from './clientStatementPdf.service.js';
import { renderInvoicePdf } from './invoiceBrowser.service.js';

export async function deliverInvoice(clientId: unknown, data: ClientStatementPdfData, html: string, fileName: string, res: Response, prerendered?: Promise<Buffer>) {
  // A failed renderer must never consume an invoice number.
  // Reading the counter is side-effect free, so it can run alongside the render.
  const [pdf, counter] = await Promise.all([
    // Use the PDF pre-rendered from this same snapshot HTML when available; otherwise render now
    prerendered ? prerendered.catch(() => renderInvoicePdf(html)) : renderInvoicePdf(html),
    InvoiceCounter.findOne({ key: 'client_invoice_sequence' }),
  ]);
  const issued = data.invoiceNumber || '001';
  const step = counter?.step || 1;
  const match = issued.match(/^(.*?)(\d+)([^\d]*)$/);
  const next = match ? `${match[1]}${String(Number(match[2]) + step).padStart(match[2].length, '0')}${match[3]}` : `${issued}-001`;
  const nextNumeric = match ? Number(match[2]) + step : 1;
  await Promise.all([
    InvoiceCounter.updateOne({ key: 'client_invoice_sequence' }, {
      $max: { currentNumber: nextNumeric }, $set: { lastIssuedAt: new Date() }, $setOnInsert: { step },
    }, { upsert: true }),
    Client.updateOne({ _id: clientId }, { $set: { lastInvoiceNumber: issued } }),
  ]);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Next-Invoice-Number, X-Invoice-Number');
  res.setHeader('X-Invoice-Number', issued);
  res.setHeader('X-Next-Invoice-Number', next);
  res.send(pdf);
}
