import { Response } from 'express';
import { ClientPayment } from '../models/ClientPayment.js';
import { Project } from '../models/Project.js';
import { Client } from '../models/Client.js';
import { toDecimal, fromDecimal, round2 } from '../utils/decimalHelper.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';

export async function listPayments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { projectId, clientId } = req.query;
    const filter: any = {};
    if (projectId) filter.projectId = projectId;
    if (clientId) filter.clientId = clientId;

    const payments = await ClientPayment.find(filter)
      .populate('projectId', 'projectName projectCode projectValue')
      .populate('clientId', 'name companyName clientCode')
      .populate('createdBy', 'name email')
      .sort({ paymentDate: -1 });

    const formatted = payments.map((p) => ({
      ...p.toObject(),
      amount: fromDecimal(p.amount),
    }));

    res.json({ success: true, count: formatted.length, payments: formatted, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { clientId, projectId, amount, paymentDate, paymentMethod, transactionReference, notes } = req.body;

    let targetClientId = clientId;
    let projectDoc = null;

    if (projectId) {
      projectDoc = await Project.findById(projectId);
      if (!projectDoc) {
        res.status(404).json({ success: false, message: 'Specified project not found.' });
        return;
      }
      if (!targetClientId) {
        targetClientId = projectDoc.clientId;
      }
    }

    if (!targetClientId) {
      res.status(400).json({ success: false, message: 'Client ID or Project ID is required.' });
      return;
    }

    const client = await Client.findById(targetClientId);
    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found.' });
      return;
    }

    const numAmount = round2(parseFloat(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, message: 'Payment amount must be greater than 0.' });
      return;
    }

    // 1. Calculate client-level net contract value across all deliverables
    const clientProjects = await Project.find({ clientId: client._id }).sort({ createdAt: 1 });
    const clientNetContractValue = round2(
      clientProjects.reduce((sum, p) => {
        const grossVal = fromDecimal(p.projectValue);
        const discountPercent = Number(p.discountPercent) || 0;
        const discountAmount = p.discountAmount
          ? fromDecimal(p.discountAmount)
          : round2((grossVal * discountPercent) / 100);
        return sum + Math.max(0, round2(grossVal - discountAmount));
      }, 0)
    );

    // 2. Sum existing payments already recorded for this client
    const existingPayments = await ClientPayment.find({ clientId: client._id });
    const paymentsAlreadyReceived = round2(
      existingPayments.reduce((sum, p) => sum + fromDecimal(p.amount), 0)
    );

    // 3. Client-level outstanding / remaining balance
    const remainingBalance = Math.max(0, round2(clientNetContractValue - paymentsAlreadyReceived));

    if (clientNetContractValue > 0 && remainingBalance <= 0) {
      res.status(400).json({
        success: false,
        message: `This client is already fully paid. Total contract value is ₹${clientNetContractValue.toLocaleString('en-IN')}, and ₹${paymentsAlreadyReceived.toLocaleString('en-IN')} has already been received.`,
      });
      return;
    }

    if (clientNetContractValue > 0 && numAmount > remainingBalance) {
      res.status(400).json({
        success: false,
        message: `Payment amount of ₹${numAmount.toLocaleString('en-IN')} exceeds the remaining client contract balance of ₹${remainingBalance.toLocaleString('en-IN')}. Total contract: ₹${clientNetContractValue.toLocaleString('en-IN')}, already received: ₹${paymentsAlreadyReceived.toLocaleString('en-IN')}.`,
      });
      return;
    }

    // 4. Determine attributed project (if specified or auto-attributing to oldest open deliverable)
    let attributedProjectId = projectDoc ? projectDoc._id : undefined;
    if (!attributedProjectId && clientProjects.length > 0) {
      for (const cp of clientProjects) {
        const cpPayments = await ClientPayment.find({ projectId: cp._id });
        const cpPaid = round2(cpPayments.reduce((sum, p) => sum + fromDecimal(p.amount), 0));
        const cpGross = fromDecimal(cp.projectValue);
        const cpDiscountPercent = Number(cp.discountPercent) || 0;
        const cpDiscount = cp.discountAmount
          ? fromDecimal(cp.discountAmount)
          : round2((cpGross * cpDiscountPercent) / 100);
        const cpNet = Math.max(0, round2(cpGross - cpDiscount));
        if (cpNet - cpPaid > 0) {
          attributedProjectId = cp._id;
          projectDoc = cp;
          break;
        }
      }
      if (!attributedProjectId && clientProjects.length > 0) {
        attributedProjectId = clientProjects[0]._id;
        projectDoc = clientProjects[0];
      }
    }

    const payment = await ClientPayment.create({
      projectId: attributedProjectId,
      clientId: client._id,
      amount: toDecimal(numAmount),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || 'bank_transfer',
      transactionReference,
      notes,
      createdBy: req.user!._id,
    });

    await logAudit({
      userId: req.user!._id,
      action: 'RECORD_CLIENT_PAYMENT',
      entityType: 'ClientPayment',
      entityId: payment._id,
      newValue: {
        clientId: client._id,
        clientName: client.companyName || client.name,
        projectId: attributedProjectId,
        projectCode: projectDoc?.projectCode,
        amount: numAmount,
        paymentMethod,
        transactionReference,
      },
    });

    createNotification({
      role: 'admin',
      type: 'payment',
      title: 'Client Payment Recorded',
      message: `Payment of ₹${numAmount.toLocaleString('en-IN')} recorded for client "${client.companyName || client.name}".`,
      link: '/admin/payments',
      metadata: { paymentId: payment._id, clientId: client._id, projectId: attributedProjectId, amount: numAmount },
    }).catch(() => {});

    const paymentData = {
      ...payment.toObject(),
      amount: numAmount,
    };

    res.status(201).json({
      success: true,
      message: `Payment of ₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} recorded successfully for ${client.companyName || client.name}.`,
      payment: paymentData,
      data: paymentData,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deletePayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const payment = await ClientPayment.findById(id);
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found.' });
      return;
    }

    const oldValue = payment.toObject();
    await ClientPayment.findByIdAndDelete(payment._id);

    await logAudit({
      userId: req.user!._id,
      action: 'DELETE_CLIENT_PAYMENT',
      entityType: 'ClientPayment',
      entityId: payment._id,
      oldValue,
    });

    res.json({ success: true, message: 'Payment record deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
