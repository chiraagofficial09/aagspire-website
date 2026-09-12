import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { ENV } from './config/env.js';

async function startServer() {
  await connectDatabase();

  app.listen(ENV.PORT, () => {
    console.log(`[Aagspire Work Server] Running on http://localhost:${ENV.PORT}`);
  });
}

startServer();
