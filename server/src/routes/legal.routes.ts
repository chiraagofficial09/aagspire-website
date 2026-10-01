import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  getPublicLegalDoc,
  getAdminLegalDoc,
  updateAdminLegalDoc,
} from '../controllers/legal.controller.js';

const router = Router();

// Public route for Main Website visitors (Terms & Conditions, Privacy Policy)
router.get('/:type', getPublicLegalDoc);

// Admin management routes (Secured for administrators)
router.get('/admin/:type', authenticate, requireRole('admin'), getAdminLegalDoc);
router.put('/admin/:type', authenticate, requireRole('admin'), updateAdminLegalDoc);

export default router;
