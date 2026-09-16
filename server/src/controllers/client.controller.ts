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
import { calculateFinancialMetrics } from '../services/dashboardFinance.js';

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
    const clientIds = clients.map((c) => c._id);

    const monthQuery = (req.query.month as string) || '';
    let startOfMonth: Date | null = null;
    let endOfMonth: Date | null = null;
    if (monthQuery && monthQuery !== 'all') {
      const [yr, mo] = monthQuery.split('-').map(Number);
      if (yr && mo) {
        startOfMonth = new Date(yr, mo - 1, 1, 0, 0, 0, 0);
        endOfMonth = new Date(yr, mo, 0, 23, 59, 59, 999);
      }
    }

    // Batch fetch all projects and payments for these clients in parallel
    const [allProjects, allPayments] = await Promise.all([
      Project.find({ clientId: { $in: clientIds } }).lean(),
      ClientPayment.find({ clientId: { $in: clientIds } }).lean(),
    ]);

    const projectsByClient = new Map<string, any[]>();
    for (const p of allProjects) {
      const cid = p.clientId?.toString();
      if (cid) {
        if (endOfMonth) {
          const pDate = new Date(p.startDate || p.createdAt || 0);
          if (pDate > endOfMonth) continue;
        }
        let arr = projectsByClient.get(cid);
        if (!arr) {
          arr = [];
          projectsByClient.set(cid, arr);
        }
        arr.push(p);
      }
    }

    const paymentsByClientInMonth = new Map<string, number>();
    const paymentsByClientCumulative = new Map<string, number>();
    for (const pm of allPayments) {
      const cid = pm.clientId?.toString();
      if (cid) {
        const pmDate = new Date(pm.paymentDate || pm.createdAt || 0);
        const amt = fromDecimal(pm.amount);
        if (endOfMonth) {
          if (pmDate <= endOfMonth) {
            paymentsByClientCumulative.set(cid, (paymentsByClientCumulative.get(cid) || 0) + amt);
          }
          if (startOfMonth && pmDate >= startOfMonth && pmDate <= endOfMonth) {
            paymentsByClientInMonth.set(cid, (paymentsByClientInMonth.get(cid) || 0) + amt);
          }
        } else {
          paymentsByClientInMonth.set(cid, (paymentsByClientInMonth.get(cid) || 0) + amt);
          paymentsByClientCumulative.set(cid, (paymentsByClientCumulative.get(cid) || 0) + amt);
        }
      }
    }

    // Fast in-memory enrichment without any extra database queries
    const enriched = clients.map((client) => {
      const cidStr = client._id.toString();
      const projects = projectsByClient.get(cidStr) || [];
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

      const totalPaid = round2(
        endOfMonth
          ? (paymentsByClientInMonth.get(cidStr) || 0)
          : (paymentsByClientCumulative.get(cidStr) || 0)
      );
      const totalPaidCumulative = round2(paymentsByClientCumulative.get(cidStr) || 0);
      const outstanding = Math.max(0, round2(totalValue - totalPaidCumulative));

      return {
        ...client.toObject(),
        totalProjects: projects.length,
        projectsCount: projects.length,
        activeProjects: projects.filter((p) => ['in_progress', 'review'].includes(p.status)).length,
        totalBusinessValue: totalValue,
        totalContractValue: totalValue,
        totalPaid,
        totalPaidCumulative,
        totalPaymentsReceived: totalPaid,
        pendingPayment: outstanding,
        outstanding,
        financials: {
          totalBusinessValue: totalValue,
          totalContractValue: totalValue,
          totalPaid,
          totalPaidCumulative,
          totalPaymentsReceived: totalPaid,
          pendingPayment: outstanding,
          outstanding,
        },
      };
    });

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

    const targetMonth = (req.query.month as string) || undefined;

    const [financialMetrics, rawProjects, rawPayments] = await Promise.all([
      calculateFinancialMetrics({ clientId: client._id, targetMonth }),
      Project.find({ clientId: client._id }).sort({ createdAt: -1 }),
      ClientPayment.find({ clientId: client._id })
        .populate('projectId', 'projectName projectCode')
        .sort({ paymentDate: -1 }),
    ]);

    const totalBusinessValue = financialMetrics.totalAllTimeProjectValue;
    const totalPaymentsReceived = financialMetrics.totalAllTimeCashCollected;
    const pendingPayment = financialMetrics.totalAllTimeReceivable;

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
      financialSummary: financialMetrics,
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
        // Month-filtered primary cards metrics
        newProjectValue: financialMetrics.newProjectValue,
        cashCollected: financialMetrics.cashCollected,
        currentMonthCollection: financialMetrics.currentMonthCollection,
        previousOutstandingCollected: financialMetrics.previousOutstandingCollected,
        openingReceivable: financialMetrics.openingReceivable,
        closingReceivable: financialMetrics.closingReceivable,
        appliedCollections: financialMetrics.appliedCollections,
        unappliedCash: financialMetrics.unappliedCash,
        excessCash: financialMetrics.excessCash,
        collectionRate: financialMetrics.collectionRate,
        hasPreviousCollections: financialMetrics.hasPreviousCollections,
        previousCollectionsMessage: financialMetrics.previousCollectionsMessage,
      },
      projects,
      payments,
      selectedMonth: targetMonth || 'all',
    };

    res.json({
      success: true,
      data: payload,
      client,
      financialSummary: financialMetrics,
      financials: payload.financials,
      projects,
      payments,
      selectedMonth: targetMonth || 'all',
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

export function getNextInvoiceNumber(current?: string | number, step = 1): string {
  if (current === undefined || current === null || String(current).trim() === '') {
    return '001';
  }
  const str = String(current).trim();
  const match = str.match(/^(.*?)(\d+)([^\d]*)$/);
  if (!match) {
    return `${str}-001`;
  }
  const prefix = match[1];
  const digits = match[2];
  const suffix = match[3];
  const num = parseInt(digits, 10);
  const nextNum = Math.max(0, num + step);
  const padded = String(nextNum).padStart(digits.length, '0');
  return `${prefix}${padded}${suffix}`;
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

    let rawPayments = selectedIds.length > 0
      ? await ClientPayment.find({ projectId: { $in: rawProjects.map((p) => p._id) } }).sort({ paymentDate: -1 })
      : await ClientPayment.find({ clientId: client._id }).sort({ paymentDate: -1 });

    const monthQuery = (req.query.month as string) || (req.body?.month as string) || '';
    let billingMonthLabel: string | undefined;
    let billingPeriodLabel: string | undefined;
    let statementDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    if (monthQuery && monthQuery !== 'all') {
      const [yr, mo] = monthQuery.split('-').map(Number);
      if (yr && mo) {
        const startOfMonth = new Date(yr, mo - 1, 1, 0, 0, 0, 0);
        const endOfMonth = new Date(yr, mo, 0, 23, 59, 59, 999);
        billingMonthLabel = startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        billingPeriodLabel = `${startOfMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} – ${endOfMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        // When sending invoice to client at end of month, invoice date is set to end of that month
        statementDate = endOfMonth.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        if (selectedIds.length === 0) {
          rawProjects = rawProjects.filter((p) => {
            const pDate = new Date(p.startDate || p.createdAt || 0);
            return pDate >= startOfMonth && pDate <= endOfMonth;
          });
        }

        rawPayments = rawPayments.filter((pm) => {
          const pmDate = new Date(pm.paymentDate || pm.createdAt || 0);
          return pmDate <= endOfMonth;
        });
      }
    }

    const customDateParam = (req.query.invoiceDate as string) || (req.body?.invoiceDate as string);
    if (customDateParam) {
      const parsed = new Date(customDateParam.includes('T') ? customDateParam : `${customDateParam}T00:00:00`);
      if (!isNaN(parsed.getTime())) {
        statementDate = parsed.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } else {
        statementDate = customDateParam;
      }
    }

    const digits = client.clientCode?.match(/\d+/g);
    const defaultNum = digits && digits.length > 0
      ? (digits[digits.length - 1].length === 4 && digits[digits.length - 1].startsWith('0') ? digits[digits.length - 1].substring(1) : digits[digits.length - 1])
      : '001';
    const invoiceNumber = (req.query.invoiceNumber as string) || req.body?.invoiceNumber || defaultNum;
    const taxPercent = Number(req.query.taxPercent || req.body?.taxPercent || 0);
    const discountAmount = Number(req.query.discountAmount || req.body?.discountAmount || 0);
    const notes = (req.query.notes as string) || req.body?.notes || '';

    let customDiscounts: Record<string, number> = {};
    const rawProjectDiscounts = (req.query.projectDiscounts as string) || req.body?.projectDiscounts;
    if (rawProjectDiscounts) {
      try {
        customDiscounts = typeof rawProjectDiscounts === 'string' ? JSON.parse(rawProjectDiscounts) : rawProjectDiscounts;
      } catch (e) {
        customDiscounts = {};
      }
    }

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
        const pIdStr = String(p._id);
        const manualDiscount = customDiscounts[pIdStr] !== undefined
          ? Number(customDiscounts[pIdStr]) || 0
          : (p.discountAmount ? fromDecimal(p.discountAmount) : 0);
        const grossPrice = round2(val + manualDiscount);
        return {
          projectCode: p.projectCode,
          projectName: p.projectName,
          status: p.status,
          projectValue: val,
          grossProjectValue: grossPrice,
          discountPercent: Number(p.discountPercent) || 0,
          discountAmount: manualDiscount,
          paidAmount: paid,
          balance: val,
          startDate: p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : undefined,
          deadline: p.deadline ? new Date(p.deadline).toLocaleDateString('en-IN') : undefined,
        };
      })
    );

    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sept', 'oct', 'nov', 'dec'];
    let targetDate = new Date();
    if (monthQuery && monthQuery !== 'all') {
      const [yr, mo] = monthQuery.split('-').map(Number);
      if (yr && mo) targetDate = new Date(yr, mo - 1, 1);
    } else if (customDateParam) {
      const parsed = new Date(customDateParam.includes('T') ? customDateParam : `${customDateParam}T00:00:00`);
      if (!isNaN(parsed.getTime())) targetDate = parsed;
    }
    const monthSlug = monthNames[targetDate.getMonth()];
    const yearSlug = targetDate.getFullYear();
    const fileName = `Aagspire_invoice_${monthSlug}_${yearSlug}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );

    // Save client's lastInvoiceNumber in MongoDB
    client.lastInvoiceNumber = invoiceNumber;
    await client.save().catch(() => {});

    // Advance global invoice counter in MongoDB and compute next invoice number on every download
    let nextInvoiceNumber = getNextInvoiceNumber(invoiceNumber, 1);
    try {
      let counter = await InvoiceCounter.findOne({ key: 'client_invoice_sequence' });
      const step = counter?.step || 1;
      nextInvoiceNumber = getNextInvoiceNumber(invoiceNumber, step);
      const curNum = parseInt(String(invoiceNumber).replace(/\D/g, ''), 10) || 0;
      const nextNum = curNum + step;
      if (counter) {
        counter.currentNumber = nextNum;
        counter.lastIssuedAt = new Date();
        await counter.save();
      } else {
        await InvoiceCounter.create({
          key: 'client_invoice_sequence',
          currentNumber: nextNum,
          step: 1,
          lastIssuedAt: new Date(),
        });
      }
    } catch (cntErr) {
      console.error('Failed to advance database invoice counter:', cntErr);
    }

    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Disposition, X-Next-Invoice-Number, X-Invoice-Number'
    );
    res.setHeader('X-Invoice-Number', invoiceNumber);
    res.setHeader('X-Next-Invoice-Number', nextInvoiceNumber);

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
        statementDate,
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
        currentNumber: 1,
        step: 1,
      });
    }
    res.json({
      success: true,
      data: {
        currentNumber: String(counter.currentNumber),
        step: counter.step || 1,
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
        currentNumber: 1,
        step: 1,
      });
    }

    if (increment) {
      counter.currentNumber += (counter.step || 1);
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
