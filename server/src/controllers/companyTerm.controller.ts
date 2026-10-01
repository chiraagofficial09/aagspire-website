import { Response } from 'express';
import { StaffTerms } from '../models/CompanyTerm.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

// Helper: Ensure the single terms document exists (empty by default)
async function getOrCreateTermsDoc() {
  let doc = await StaffTerms.findOne();
  if (!doc) {
    doc = await StaffTerms.create({
      content: '',
      lastUpdated: new Date(),
    });
  }
  return doc;
}

/**
 * Admin: Get Terms & Conditions content
 * GET /api/admin/terms
 */
export async function getStaffTermsAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const doc = await getOrCreateTermsDoc();
    res.json({
      success: true,
      data: {
        content: doc.content || '',
        lastUpdated: doc.lastUpdated,
      },
    });
  } catch (error: any) {
    console.error('Error fetching staff terms (admin):', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve terms' });
  }
}

/**
 * Admin: Save Terms & Conditions content (Create / Update)
 * PUT /api/admin/terms or POST /api/admin/terms
 */
export async function saveStaffTermsAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { content } = req.body;
    let doc = await StaffTerms.findOne();
    if (!doc) {
      doc = new StaffTerms();
    }

    doc.content = typeof content === 'string' ? content : '';
    doc.lastUpdated = new Date();
    if (req.user?._id) {
      doc.updatedBy = req.user._id;
    }

    await doc.save();

    res.json({
      success: true,
      message: 'Terms & Conditions saved successfully',
      data: {
        content: doc.content,
        lastUpdated: doc.lastUpdated,
      },
    });
  } catch (error: any) {
    console.error('Error saving staff terms:', error);
    res.status(500).json({ success: false, message: 'Failed to save terms' });
  }
}

/**
 * Admin: Clear / Delete Terms & Conditions content
 * DELETE /api/admin/terms
 */
export async function deleteStaffTermsAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let doc = await StaffTerms.findOne();
    if (doc) {
      doc.content = '';
      doc.lastUpdated = new Date();
      if (req.user?._id) {
        doc.updatedBy = req.user._id;
      }
      await doc.save();
    }

    res.json({
      success: true,
      message: 'Terms & Conditions content cleared successfully',
      data: { content: '', lastUpdated: new Date() },
    });
  } catch (error: any) {
    console.error('Error deleting staff terms:', error);
    res.status(500).json({ success: false, message: 'Failed to delete terms' });
  }
}

/**
 * Employee: Get Terms & Conditions (Read-Only)
 * GET /api/employee/terms
 */
export async function getStaffTermsEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const doc = await getOrCreateTermsDoc();
    res.json({
      success: true,
      data: {
        content: doc.content || '',
        lastUpdated: doc.lastUpdated,
      },
    });
  } catch (error: any) {
    console.error('Error fetching employee terms:', error);
    res.status(500).json({ success: false, message: 'Failed to load terms' });
  }
}

// Aliases for compatibility
export const listCompanyTermsAdmin = getStaffTermsAdmin;
export const createCompanyTerm = saveStaffTermsAdmin;
export const updateCompanyTerm = saveStaffTermsAdmin;
export const deleteCompanyTerm = deleteStaffTermsAdmin;
export const listCompanyTermsEmployee = getStaffTermsEmployee;
export const getCompanyTermById = getStaffTermsAdmin;
