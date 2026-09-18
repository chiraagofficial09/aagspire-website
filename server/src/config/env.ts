import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: (process.env.NODE_ENV || 'development').trim(),
  MONGODB_URI: (process.env.MONGODB_URI || 'mongodb://localhost:27017/aagspire_work').trim(),
  JWT_SECRET: (process.env.JWT_SECRET || 'aagspire_work_default_secret_key_2026').trim(),
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || '7d').trim(),
  CLIENT_ORIGIN: (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  ADMIN_INITIAL_EMAIL: (process.env.ADMIN_INITIAL_EMAIL || 'admin@aagspire.com').trim(),
  ADMIN_INITIAL_PASSWORD: (process.env.ADMIN_INITIAL_PASSWORD || 'AagspireAdmin@2026').trim(),
  RESEND_API_KEY: (process.env.RESEND_API_KEY || '').trim(),
  RESEND_FROM_EMAIL: (process.env.RESEND_FROM_EMAIL || 'Aagspire <onboarding@resend.dev>').trim(),
  EMAILJS_SERVICE_ID: (process.env.EMAILJS_SERVICE_ID || 'service_b81cuxs').trim(),
  EMAILJS_TEMPLATE_ID: (process.env.EMAILJS_TEMPLATE_ID || '').trim(),
  EMAILJS_PUBLIC_KEY: (process.env.EMAILJS_PUBLIC_KEY || '8PDKzojjqVOtZ9Dhn').trim(),
  EMAILJS_PRIVATE_KEY: (process.env.EMAILJS_PRIVATE_KEY || '').trim(),
};
