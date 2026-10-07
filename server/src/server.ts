import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { ENV } from './config/env.js';
import { startAutoClockOutJob } from './services/autoClockOut.service.js';

async function startServer() {
  await connectDatabase();
  startAutoClockOutJob();

  app.listen(ENV.PORT, () => {
    console.log(`[Aagspire Work Server] Running on http://localhost:${ENV.PORT}`);

    // Pre-warm the shared Chromium instance so the first invoice download doesn't pay the browser launch
    import('./services/invoiceBrowser.service.js')
      .then(({ renderInvoicePdf }) => renderInvoicePdf('<main style="height:10px"></main>'))
      .catch((err) => console.warn('[Aagspire Work Server] Invoice renderer warm-up skipped:', err?.message || err));
  });
}

// Server auto-reload trigger
startServer();
