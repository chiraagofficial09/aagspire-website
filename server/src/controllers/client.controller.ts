import { Response } from 'express';
import { Client } from '../models/Client.js';
import { Project } from '../models/Project.js';
import { ClientPayment } from '../models/ClientPayment.js';
import { generateClientCode } from '../utils/codeGenerator.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';
import { fromDecimal, round2 } from '../utils/decimalHelper.js';
import { generateClientStatementPdfStream } from '../services/clientStatementPdf.service.js';
import { InvoiceCounter } from '../models/InvoiceCounter.js';

export async function listClients(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { search, status } = req.query;
    const filter: any = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const regex = new RegExp(search as string, 'i');
      filter.$or = [{ name: regex }, { companyName: regex }, { clientCode: regex }, { email: regex }];
    }

    const clients = await Client.find(filter).sort({ createdAt: -1 });

    // Enrich with projects count and financial totals
    const enriched = await Promise.all(
      clients.map(async (client) => {
        const projects = await Project.find({ clientId: client._id });
        const totalValue = round2(
          projects.reduce((sum, p) => {
            const grossVal = fromDecimal(p.projectValue);
            const discountPercent = Number(p.discountPercent) || 0;
            const discountAmount = p.discountAmount
              ? fromDecimal(p.discountAmount)
              : round2((grossVal * discountPercent) / 100);
            return sum + Math.max(0, round2(grossVal - discountAmount));
          }, 0)
        );

        const payments = await ClientPayment.find({ clientId: client._id });
        const totalPaid = round2(
          payments.reduce((sum, pm) => sum + fromDecimal(pm.amount), 0)
        );
        const outstanding = Math.max(0, round2(totalValue - totalPaid));

        return {
          ...client.toObject(),
          totalProjects: projects.length,
          activeProjects: projects.filter((p) => ['in_progress', 'review'].includes(p.status)).length,
          totalBusinessValue: totalValue,
          totalContractValue: totalValue,
          totalPaid,
          totalPaymentsReceived: totalPaid,
          pendingPayment: outstanding,
          outstanding,
          financials: {
            totalBusinessValue: totalValue,
            totalContractValue: totalValue,
            totalPaid,
            totalPaymentsReceived: totalPaid,
            pendingPayment: outstanding,
            outstanding,
          },
        };
      })
    );

    res.json({ success: true, count: enriched.length, clients: enriched, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createClient(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, companyName, email, phone, address, gstNumber, industry, source, notes, contactPerson, taxId } = req.body;

    const finalName = name || companyName;
    if (!finalName) {
      res.status(400).json({ success: false, message: 'Client name is required.' });
      return;
    }

    const finalCompanyName = companyName || name;
    const finalGst = gstNumber || taxId;

    const count = await Client.countDocuments();
    const clientCode = generateClientCode(count + 1);

    const client = await Client.create({
      clientCode,
      name: finalName,
      companyName: finalCompanyName,
      email,
      phone,
      address,
      gstNumber: finalGst,
      industry,
      source,
      notes,
      createdBy: req.user!._id,
      status: 'active',
    });

    await logAudit({
      userId: req.user!._id,
      action: 'CREATE_CLIENT',
      entityType: 'Client',
      entityId: client._id,
      newValue: { clientCode, name: finalName, companyName: finalCompanyName },
    });

    createNotification({
      role: 'admin',
      type: 'client',
      title: 'New Client Added',
      message: `Client "${finalCompanyName || finalName}" (${clientCode}) was added to registry.`,
      link: '/admin/clients',
      metadata: { clientId: client._id },
    }).catch(() => {});

    res.status(201).json({ success: true, message: 'Client created successfully.', client, data: client });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getClientById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id || req.params.clientId;
    const client = await Client.findById(id);
    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found.' });
      return;
    }

    const rawProjects = await Project.find({ clientId: client._id }).sort({ createdAt: -1 });
    const rawPayments = await ClientPayment.find({ clientId: client._id })
      .populate('projectId', 'projectName projectCode')
      .sort({ paymentDate: -1 });

    const totalBusinessValue = round2(
      rawProjects.reduce((sum, p) => {
        const grossVal = fromDecimal(p.projectValue);
        const discountPercent = Number(p.discountPercent) || 0;
        const discountAmount = p.discountAmount
          ? fromDecimal(p.discountAmount)
          : round2((grossVal * discountPercent) / 100);
        return sum + Math.max(0, round2(grossVal - discountAmount));
      }, 0)
    );
    const totalPaymentsReceived = round2(
      rawPayments.reduce((sum, pm) => sum + fromDecimal(pm.amount), 0)
    );
    const pendingPayment = Math.max(0, round2(totalBusinessValue - totalPaymentsReceived));

    const projects = await Promise.all(
      rawProjects.map(async (p) => {
        const pPayments = await ClientPayment.find({ projectId: p._id });
        const paid = round2(pPayments.reduce((sum, pm) => sum + fromDecimal(pm.amount), 0));
        const grossVal = fromDecimal(p.projectValue);
        const discountPercent = Number(p.discountPercent) || 0;
        const discountAmount = p.discountAmount
          ? fromDecimal(p.discountAmount)
          : round2((grossVal * discountPercent) / 100);
        const netVal = Math.max(0, round2(grossVal - discountAmount));
        return {
          ...p.toObject(),
          title: p.projectName,
          projectValue: netVal,
          grossProjectValue: grossVal,
          discountAmount,
          discountPercent,
          totalAmount: netVal,
          paidAmount: paid,
          balance: Math.max(0, round2(netVal - paid)),
        };
      })
    );

    const payments = rawPayments.map((pm) => ({
      ...pm.toObject(),
      amount: fromDecimal(pm.amount),
    }));

    const payload = {
      ...client.toObject(),
      client,
      totalContractValue: totalBusinessValue,
      totalBusinessValue,
      totalPaid: totalPaymentsReceived,
      totalPaymentsReceived,
      pendingPayment,
      outstanding: pendingPayment,
      financials: {
        totalContractValue: totalBusinessValue,
        totalBusinessValue,
        totalPaid: totalPaymentsReceived,
        totalPaymentsReceived,
        pendingPayment,
        outstanding: pendingPayment,
        totalProjects: projects.length,
        activeProjects: projects.filter((p) => ['in_progress', 'review'].includes(p.status)).length,
        completedProjects: projects.filter((p) => ['completed', 'delivered'].includes(p.status)).length,
      },
      projects,
      payments,
    };

    res.json({
      success: true,
      data: payload,
      client,
      financials: payload.financials,
      projects,
      payments,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateClient(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id || req.params.clientId;
    const client = await Client.findById(id);
    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found.' });
      return;
    }

    const oldValue = client.toObject();
    Object.assign(client, req.body);
    if (req.body.name && !req.body.companyName && !client.companyName) {
      client.companyName = req.body.name;
    }
    await client.save();

    await logAudit({
      userId: req.user!._id,
      action: 'UPDATE_CLIENT',
      entityType: 'Client',
      entityId: client._id,
      oldValue,
      newValue: client.toObject(),
    });

    res.json({ success: true, message: 'Client details updated.', client, data: client });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteClient(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id || req.params.clientId;
    const client = await Client.findById(id);
    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found.' });
      return;
    }

    const projectsCount = await Project.countDocuments({ clientId: client._id });
    if (projectsCount > 0 && req.query.force !== 'true') {
      res.status(400).json({
        success: false,
        message: `Client has ${projectsCount} linked project(s). Please reassign or delete those projects first, or use force=true.`,
      });
      return;
    }

    const oldValue = client.toObject();
    await Client.findByIdAndDelete(client._id);

    await logAudit({
      userId: req.user!._id,
      action: 'DELETE_CLIENT',
      entityType: 'Client',
      entityId: client._id,
      oldValue,
    });

    res.json({ success: true, message: `Client ${client.name || client.companyName} deleted successfully.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function downloadClientStatementPdf(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id || req.params.clientId;
    const client = await Client.findById(id);
    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found.' });
      return;
    }

    const selectedIds = req.query.projectIds
      ? (req.query.projectIds as string).split(',').filter(Boolean)
      : (req.body?.projectIds || []);

    let rawProjects = await Project.find({ clientId: client._id }).sort({ createdAt: -1 });
    if (selectedIds.length > 0) {
      rawProjects = rawProjects.filter((p) => selectedIds.includes(p._id.toString()));
    }

    const rawPayments = selectedIds.length > 0
      ? await ClientPayment.find({ projectId: { $in: rawProjects.map((p) => p._id) } }).sort({ paymentDate: -1 })
      : await ClientPayment.find({ clientId: client._id }).sort({ paymentDate: -1 });

    const digits = client.clientCode?.match(/\d+/g);
    const defaultNum = digits && digits.length > 0
      ? (digits[digits.length - 1].length === 4 && digits[digits.length - 1].startsWith('0') ? digits[digits.length - 1].substring(1) : digits[digits.length - 1])
      : '001';
    const invoiceNumber = (req.query.invoiceNumber as string) || req.body?.invoiceNumber || defaultNum;
    const taxPercent = Number(req.query.taxPercent || req.body?.taxPercent || 0);
    const discountAmount = Number(req.query.discountAmount || req.body?.discountAmount || 0);
    const notes = (req.query.notes as string) || req.body?.notes || '';

    const subtotal = round2(
      rawProjects.reduce((sum, p) => sum + fromDecimal(p.projectValue), 0)
    );
    const taxAmount = round2((subtotal * taxPercent) / 100);
    const totalRevenue = round2(subtotal + taxAmount - discountAmount);

    const totalPaid = round2(
      rawPayments.reduce((sum, pm) => sum + fromDecimal(pm.amount), 0)
    );
    const pendingBalance = Math.max(0, round2(totalRevenue - totalPaid));

    const projects = await Promise.all(
      rawProjects.map(async (p) => {
        const pPayments = await ClientPayment.find({ projectId: p._id });
        const paid = round2(pPayments.reduce((sum, pm) => sum + fromDecimal(pm.amount), 0));
        const val = fromDecimal(p.projectValue);
        const discountPercent = Number(p.discountPercent) || 0;
        const discountAmount = p.discountAmount
          ? fromDecimal(p.discountAmount)
          : round2((val * discountPercent) / 100);
        const netVal = Math.max(0, round2(val - discountAmount));
        return {
          projectCode: p.projectCode,
          projectName: p.projectName,
          status: p.status,
          projectValue: val,
          grossProjectValue: val,
          discountPercent,
          discountAmount,
          paidAmount: paid,
          balance: netVal,
          startDate: p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : undefined,
          deadline: p.deadline ? new Date(p.deadline).toLocaleDateString('en-IN') : undefined,
        };
      })
    );

    const safeFileIdentifier = (invoiceNumber || client.clientCode || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Aagspire_Invoice_${safeFileIdentifier}.pdf"`
    );

    // 1. Check if this exact invoice number was already issued to this client
    const isAlreadyIssued = Boolean(
      client.lastInvoiceNumber && client.lastInvoiceNumber.trim() === invoiceNumber.trim()
    );

    // Save client's lastInvoiceNumber in MongoDB
    client.lastInvoiceNumber = invoiceNumber;
    await client.save().catch(() => {});

    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Invoice-Already-Issued');
    res.setHeader('X-Invoice-Already-Issued', isAlreadyIssued ? 'true' : 'false');

    // 2. Only advance invoice counter in MongoDB by +3 if it is a NEW invoice (same invoice re-download does NOT increment)
    if (!isAlreadyIssued) {
      try {
        let counter = await InvoiceCounter.findOne({ key: 'client_invoice_sequence' });
        const curNum = parseInt(String(invoiceNumber).replace(/\D/g, ''), 10) || 10;
        const step = counter?.step || 3;
        const nextNum = curNum + step;
        if (counter) {
          if (counter.currentNumber <= curNum) {
            counter.currentNumber = nextNum;
          }
          counter.lastIssuedAt = new Date();
          await counter.save();
        } else {
          await InvoiceCounter.create({
            key: 'client_invoice_sequence',
            currentNumber: nextNum,
            step: 3,
            lastIssuedAt: new Date(),
          });
        }
      } catch (cntErr) {
        console.error('Failed to advance database invoice counter:', cntErr);
      }
    }

    generateClientStatementPdfStream(
      {
        invoiceNumber,
        clientCode: client.clientCode,
        clientName: client.name,
        companyName: client.companyName || client.name,
        contactPerson: (client as any).contactPerson,
        email: client.email,
        phone: client.phone,
        address: client.address,
        gstNumber: client.gstNumber,
        statementDate: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        subtotal,
        taxPercent,
        taxAmount,
        discountAmount,
        totalRevenue,
        totalPaid,
        pendingBalance,
        notes,
        projects,
      },
      res
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getInvoiceCounter(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let counter = await InvoiceCounter.findOne({ key: 'client_invoice_sequence' });
    if (!counter) {
      counter = await InvoiceCounter.create({
        key: 'client_invoice_sequence',
        currentNumber: 10,
        step: 3,
      });
    }
    res.json({
      success: true,
      data: {
        currentNumber: String(counter.currentNumber),
        step: counter.step,
        lastIssuedAt: counter.lastIssuedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateInvoiceCounter(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { currentNumber, step, increment } = req.body;
    let counter = await InvoiceCounter.findOne({ key: 'client_invoice_sequence' });
    if (!counter) {
      counter = new InvoiceCounter({
        key: 'client_invoice_sequence',
        currentNumber: 10,
        step: 3,
      });
    }

    if (increment) {
      counter.currentNumber += (counter.step || 3);
    } else if (currentNumber !== undefined) {
      const parsed = parseInt(String(currentNumber).replace(/\D/g, ''), 10);
      if (!isNaN(parsed)) {
        counter.currentNumber = parsed;
      }
    }

    if (step !== undefined && !isNaN(Number(step))) {
      counter.step = Number(step);
    }

    counter.lastIssuedAt = new Date();
    await counter.save();

    res.json({
      success: true,
      message: 'Invoice counter saved permanently in MongoDB database.',
      data: {
        currentNumber: String(counter.currentNumber),
        step: counter.step,
        lastIssuedAt: counter.lastIssuedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
