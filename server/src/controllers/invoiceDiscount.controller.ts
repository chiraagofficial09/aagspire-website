import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Project } from '../models/Project.js';

export async function saveInvoiceDiscount(req: AuthenticatedRequest, res: Response): Promise<void> {
  const value = req.body?.invoiceDiscount;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    res.status(400).json({ success: false, message: 'Invoice discount must be a non-negative number.' });
    return;
  }
  try {
    // Keep this separate from updateProject, which recalculates project financials.
    const project = await Project.findByIdAndUpdate(req.params.id,
      { $set: { invoiceDiscount: value } },
      { new: true, runValidators: true, timestamps: false },
    ).select('_id invoiceDiscount');
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }
    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
