import { Response } from 'express';
import { Receipt } from '../models/Receipt.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { generateReceiptPdfStream } from '../services/receipt.service.js';

export async function listReceipts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { employeeId } = req.query;
    const filter: any = {};

    // Role Security: Employee strictly views own receipts
    if (req.user?.role === 'employee') {
      if (!req.employee) {
        res.json({ success: true, count: 0, receipts: [] });
        return;
      }
      filter.employeeId = req.employee._id;
    } else {
      if (employeeId) filter.employeeId = employeeId;
    }

    const receipts = await Receipt.find(filter)
      .populate('employeeId', 'fullName employeeCode designation')
      .populate('settlementId', 'settlementCode periodStart periodEnd paymentMethod')
      .sort({ issuedAt: -1 });

    res.json({ success: true, count: receipts.length, receipts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getReceiptById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const receipt = await Receipt.findById(id).populate('employeeId', 'fullName employeeCode');

    if (!receipt) {
      res.status(404).json({ success: false, message: 'Receipt not found.' });
      return;
    }

    // Role Security: Employee can only view their own
    if (req.user?.role === 'employee') {
      if (receipt.employeeId._id.toString() !== req.employee?._id.toString()) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }
    }

    res.json({ success: true, receipt });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function downloadReceiptPdf(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const receipt = await Receipt.findById(id);

    if (!receipt) {
      res.status(404).json({ success: false, message: 'Receipt not found.' });
      return;
    }

    // Role Security check
    if (req.user?.role === 'employee') {
      if (receipt.employeeId.toString() !== req.employee?._id.toString()) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${receipt.receiptCode}.pdf"`
    );

    generateReceiptPdfStream(receipt.receiptData as any, res);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
