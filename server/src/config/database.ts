import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import mongoose from 'mongoose';
import { ENV } from './env.js';

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    console.log('[Database] Connecting to MongoDB...');
    await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[Database] MongoDB connected successfully to database: ${mongoose.connection.name}`);
  } catch (error: any) {
    console.error('[Database] Failed to connect to MongoDB:', error.message || error);
    if (ENV.MONGODB_URI.includes('mongodb+srv://')) {
      console.error('[Database] Tip: If connection timed out, verify that your current IP address is whitelisted in MongoDB Atlas Network Access.');
    }
    if (ENV.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

mongoose.connection.on('error', (err) => {
  console.error('[Database] Mongoose error:', err.message || err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] Mongoose disconnected from MongoDB.');
});
