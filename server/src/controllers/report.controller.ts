import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ClientPayment } from '../models/ClientPayment.js';
import { Settlement } from '../models/Settlement.js';
import { Project } from '../models/Project.js';
import { fromDecimal } from '../utils/decimalHelper.js';

export async function exportReportCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { type } = req.params;

    if (type === 'payments') {
      const payments = await ClientPayment.find()
        .populate('projectId', 'projectName projectCode')
        .populate('clientId', 'name companyName')
        .sort({ paymentDate: -1 });

      let csv = 'Payment Date,Project Code,Project Name,Client Name,Amount (INR),Method,Transaction Ref,Notes\n';
      for (const p of payments) {
        const proj = p.projectId as any;
        const cli = p.clientId as any;
        const date = new Date(p.paymentDate).toLocaleDateString('en-IN');
        const amt = fromDecimal(p.amount);
        csv += `"${date}","${proj?.projectCode || ''}","${proj?.projectName || ''}","${cli?.companyName || cli?.name || ''}",${amt},"${p.paymentMethod}","${p.transactionReference || ''}","${p.notes || ''}"\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="aagspire-client-payments.csv"');
      res.send(csv);
      return;
    }

    if (type === 'settlements') {
      const settlements = await Settlement.find()
        .populate('employeeId', 'fullName employeeCode')
        .sort({ createdAt: -1 });

      let csv = 'Settlement Code,Employee Code,Employee Name,Period Start,Period End,Gross Earned,Previously Paid,Final Payable,Status,Payment Method,Payment Date\n';
      for (const s of settlements) {
        const emp = s.employeeId as any;
        const pStart = new Date(s.periodStart).toLocaleDateString('en-IN');
        const pEnd = new Date(s.periodEnd).toLocaleDateString('en-IN');
        const gross = fromDecimal(s.grossEarned);
        const prev = fromDecimal(s.previouslyPaid);
        const final = fromDecimal(s.finalPayable);
        const pDate = s.paymentDate ? new Date(s.paymentDate).toLocaleDateString('en-IN') : '';

        csv += `"${s.settlementCode}","${emp?.employeeCode || ''}","${emp?.fullName || ''}","${pStart}","${pEnd}",${gross},${prev},${final},"${s.status}","${s.paymentMethod || ''}","${pDate}"\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="aagspire-employee-settlements.csv"');
      res.send(csv);
      return;
    }

    if (type === 'projects') {
      const projects = await Project.find()
        .populate('clientId', 'name companyName')
        .sort({ createdAt: -1 });

      let csv = 'Project Code,Project Name,Client,Status,Project Value (INR),Created Date\n';
      for (const p of projects) {
        const cli = p.clientId as any;
        const val = fromDecimal(p.projectValue);
        const date = new Date(p.createdAt).toLocaleDateString('en-IN');
        csv += `"${p.projectCode}","${p.projectName}","${cli?.companyName || cli?.name || ''}","${p.status}",${val},"${date}"\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="aagspire-projects.csv"');
      res.send(csv);
      return;
    }

    res.status(400).json({ success: false, message: 'Invalid report type. Supported: payments, settlements, projects.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
