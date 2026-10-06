import { Response } from 'express';
import mongoose from 'mongoose';
import { ClientPayment } from '../models/ClientPayment.js';
import { Project } from '../models/Project.js';
import { Client } from '../models/Client.js';
import { toDecimal, fromDecimal, round2 } from '../utils/decimalHelper.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';
import { financeMonthRange, validMoney, validFinanceDate } from '../services/cashBankBalance.js';
import { appendRowSafely } from '../services/googleSheets.service.js';
import { clientReceivable } from '../services/clientReceivable.js';

export async function listPayments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { projectId, clientId, month } = req.query;
    const filter: any = {};
    if (projectId) filter.projectId = projectId;
    if (clientId) filter.clientId = clientId;

    if (month && month !== 'all') {
      let range;
      try { range = financeMonthRange(String(month)); } catch {
        res.status(400).json({ success: false, message: 'Invalid month; use YYYY-MM' });
        return;
      }
      filter.$expr = { $and: [
        { $gte: [{ $ifNull: ['$paymentDate', '$createdAt'] }, range.start] },
        { $lt: [{ $ifNull: ['$paymentDate', '$createdAt'] }, range.end] },
      ] };
    }

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

    if (!validMoney(amount) || (paymentDate !== undefined && !validFinanceDate(paymentDate)) ||
        (paymentMethod !== undefined && !['bank_transfer', 'upi', 'cash', 'cheque', 'other'].includes(paymentMethod))) {
      res.status(400).json({ success: false, message: 'Enter a positive amount with at most 2 decimals, a valid date and payment method.' });
      return;
    }
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
        return sum + Math.max(0, round2(grossVal));
      }, 0)
    );

    // 2. Sum existing payments already received for this client
    const existingPayments = await ClientPayment.find({ clientId: client._id });
    const paymentsAlreadyReceived = round2(
      existingPayments.reduce((sum, p) => sum + fromDecimal(p.amount), 0)
    );

    // 3. Client-level outstanding / remaining balance
    const remainingBalance = clientReceivable(clientProjects, existingPayments, client).allTimeOutstanding;

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

    // 4. Determine attributed project (ONLY if explicitly specified by user; otherwise general client payment)
    const attributedProjectId = projectDoc ? projectDoc._id : undefined;

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

    // Auto-append to Google Sheets (non-blocking)
    appendRowSafely('Client Payments', [
      new Date(payment.paymentDate).toLocaleDateString('en-IN'),
      projectDoc?.projectCode || '',
      projectDoc?.projectName || '',
      client.companyName || client.name || '',
      numAmount,
      (paymentMethod || 'bank_transfer').toUpperCase(),
      transactionReference || '',
      notes || '',
      String(payment._id),
    ]).catch(() => {});

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
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid payment ID format.' });
      return;
    }

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

export async function updatePayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid payment ID format.' });
      return;
    }

    const { amount, paymentDate, paymentMethod, transactionReference, notes, clientId, projectId } = req.body;

    const payment = await ClientPayment.findById(id);
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment record not found.' });
      return;
    }

    if (amount !== undefined && !validMoney(amount)) {
      res.status(400).json({ success: false, message: 'Enter a positive amount with at most 2 decimals.' });
      return;
    }

    if (paymentDate && !validFinanceDate(paymentDate)) {
      res.status(400).json({ success: false, message: 'Enter a valid payment date (YYYY-MM-DD).' });
      return;
    }

    if (paymentMethod !== undefined && !['bank_transfer', 'upi', 'cash', 'cheque', 'other'].includes(paymentMethod)) {
      res.status(400).json({ success: false, message: 'Invalid payment method.' });
      return;
    }

    const rawClientId = typeof clientId === 'object' && clientId?._id ? clientId._id : clientId;
    const targetClientId = rawClientId || payment.clientId;
    if (!mongoose.isValidObjectId(targetClientId)) {
      res.status(400).json({ success: false, message: 'Invalid client ID format.' });
      return;
    }

    const client = await Client.findById(targetClientId);
    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found.' });
      return;
    }

    let numAmount = amount !== undefined ? round2(parseFloat(amount)) : fromDecimal(payment.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, message: 'Payment amount must be greater than 0.' });
      return;
    }

    // Client-level net contract value across all deliverables
    const clientProjects = await Project.find({ clientId: client._id }).sort({ createdAt: 1 });
    const clientNetContractValue = round2(
      clientProjects.reduce((sum, p) => {
        const grossVal = fromDecimal(p.projectValue);
        const discountPercent = Number(p.discountPercent) || 0;
        const discountAmount = p.discountAmount
          ? fromDecimal(p.discountAmount)
          : round2((grossVal * discountPercent) / 100);
        return sum + Math.max(0, round2(grossVal));
      }, 0)
    );

    // Sum other payments already received (excluding this payment)
    const otherPayments = await ClientPayment.find({ clientId: client._id, _id: { $ne: payment._id } });
    const otherPaymentsTotal = round2(
      otherPayments.reduce((sum, p) => sum + fromDecimal(p.amount), 0)
    );

    const sameClient = String(payment.clientId) === String(client._id);
    const currentDue = clientReceivable(clientProjects,
      sameClient ? [...otherPayments, payment] : otherPayments, client).allTimeOutstanding;
    const remainingBalance = round2(currentDue + (sameClient ? fromDecimal(payment.amount) : 0));

    if (clientNetContractValue > 0 && numAmount > remainingBalance) {
      res.status(400).json({
        success: false,
        message: `Updated payment of ₹${numAmount.toLocaleString('en-IN')} exceeds the remaining client contract balance of ₹${remainingBalance.toLocaleString('en-IN')}. (Total contract: ₹${clientNetContractValue.toLocaleString('en-IN')}, other payments: ₹${otherPaymentsTotal.toLocaleString('en-IN')}).`,
      });
      return;
    }

    const oldValue = payment.toObject();

    if (amount !== undefined) payment.amount = toDecimal(numAmount);
    if (paymentDate !== undefined) payment.paymentDate = new Date(paymentDate);
    if (paymentMethod !== undefined) payment.paymentMethod = paymentMethod;
    if (transactionReference !== undefined) payment.transactionReference = transactionReference;
    if (notes !== undefined) payment.notes = notes;
    if (clientId !== undefined) payment.clientId = client._id;
    if (projectId !== undefined) payment.projectId = projectId || undefined;

    await payment.save();

    await logAudit({
      userId: req.user!._id,
      action: 'UPDATE_CLIENT_PAYMENT',
      entityType: 'ClientPayment',
      entityId: payment._id,
      oldValue,
      newValue: payment.toObject(),
    });

    const paymentData = {
      ...payment.toObject(),
      amount: numAmount,
    };

    res.json({
      success: true,
      message: `Payment updated successfully to ₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`,
      payment: paymentData,
      data: paymentData,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
