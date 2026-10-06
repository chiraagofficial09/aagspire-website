import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { ENV } from './config/env.js';
import { isDatabaseConnected } from './config/database.js';
import { errorHandler } from './middleware/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import notificationRoutes from './routes/notification.routes.js';

export const app = express();

// Security & Utility Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server, curl)
      if (!origin) return callback(null, true);

      const isAllowed = ENV.CLIENT_ORIGIN.includes(origin) || origin.startsWith('http://localhost:');
      if (isAllowed) {
        callback(null, true);
      } else if (ENV.NODE_ENV !== 'production') {
        callback(null, true); // Permissive in development
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
    // Let browsers cache the preflight so each API call doesn't need an extra OPTIONS round trip
    maxAge: 7200,
  })
);

// Gzip/brotli-compatible response compression for large JSON payloads (dashboard, lists)
app.use(compression());

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (ENV.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    service: 'Aagspire Work API',
    database: isDatabaseConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Database connectivity check for API routes
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is unavailable. Please verify MongoDB status or Atlas IP whitelist.',
    });
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/notifications', notificationRoutes);

// Global Error Handler
app.use(errorHandler);
