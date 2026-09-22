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
import { getMonthDateRange } from '../utils/dateHelper.js';

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
    const monthRange = getMonthDateRange(monthQuery);
    const startOfMonth = monthRange?.startOfMonth || null;
    const endOfMonth = monthRange?.endOfMonth || null;

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
        activeProjects: projects.filter((p) => ['start_process', 'in_process', 'in_changes'].includes(p.status)).length,
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

    const existingClients = await Client.find(
      { clientCode: { $regex: /^AAG-CLI-/ } },
      { clientCode: 1 }
    ).lean();
    let maxSeq = 0;
    for (const c of existingClients) {
      if (c.clientCode) {
        const parts = c.clientCode.split('-');
        const seq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
    let nextSeq = maxSeq + 1;
    let clientCode = generateClientCode(nextSeq);
    while (await Client.exists({ clientCode })) {
      nextSeq++;
      clientCode = generateClientCode(nextSeq);
    }

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

    // Pre-calculate payment allocation across client projects (supporting general client payments)
    const sortedProjects = [...rawProjects].sort(
      (a, b) => new Date(a.startDate || a.createdAt || 0).getTime() - new Date(b.startDate || b.createdAt || 0).getTime()
    );
    const projectPaymentsMap = new Map<string, number>();
    for (const p of sortedProjects) {
      projectPaymentsMap.set(p._id.toString(), 0);
    }

    const sortedPayments = [...rawPayments].sort(
      (a, b) => new Date(a.paymentDate || a.createdAt || 0).getTime() - new Date(b.paymentDate || b.createdAt || 0).getTime()
    );

    for (const pm of sortedPayments) {
      const amt = fromDecimal(pm.amount);
      const pId = pm.projectId ? (pm.projectId._id ? pm.projectId._id.toString() : pm.projectId.toString()) : null;
      let rem = amt;

      if (pId && projectPaymentsMap.has(pId)) {
        const targetProj = sortedProjects.find((p) => p._id.toString() === pId);
        const gross = targetProj ? fromDecimal(targetProj.projectValue) : 0;
        const cur = projectPaymentsMap.get(pId) || 0;
        const take = Math.min(rem, Math.max(0, round2(gross - cur)));
        if (take > 0) {
          projectPaymentsMap.set(pId, round2(cur + take));
          rem = round2(rem - take);
        }
      }

      if (rem > 0) {
        for (const p of sortedProjects) {
          if (rem <= 0) break;
          const pid = p._id.toString();
          const gross = fromDecimal(p.projectValue);
          const cur = projectPaymentsMap.get(pid) || 0;
          const take = Math.min(rem, Math.max(0, round2(gross - cur)));
          if (take > 0) {
            projectPaymentsMap.set(pid, round2(cur + take));
            rem = round2(rem - take);
          }
        }
      }
    }

    const projects = rawProjects.map((p) => {
      const pid = p._id.toString();
      const paid = projectPaymentsMap.get(pid) || 0;
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
    });

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
        activeProjects: projects.filter((p) => ['start_process', 'in_process', 'in_changes'].includes(p.status)).length,
        completedProjects: projects.filter((p) => ['delivered', 'completed'].includes(p.status)).length,
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

    let rawPayments = await ClientPayment.find({
      $or: [
        { clientId: client._id },
        { projectId: { $in: rawProjects.map((p) => p._id) } },
      ],
    }).sort({ paymentDate: 1, createdAt: 1 });

    const monthQuery = (req.query.month as string) || (req.body?.month as string) || '';
    let billingMonthLabel: string | undefined;
    let billingPeriodLabel: string | undefined;
    let statementDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const monthTokens = monthQuery
      ? monthQuery.split(',').map((s) => s.trim()).filter((s) => /^\d{4}-\d{2}$/.test(s))
      : [];

    let monthRange: { startOfMonth: Date; endOfMonth: Date } | null = null;

    if (monthTokens.length === 1) {
      monthRange = getMonthDateRange(monthTokens[0]);
      if (monthRange) {
        const { startOfMonth, endOfMonth } = monthRange;
        billingMonthLabel = startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        billingPeriodLabel = `${startOfMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} – ${endOfMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
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
    } else if (monthTokens.length > 1) {
      monthTokens.sort();
      const firstRange = getMonthDateRange(monthTokens[0]);
      const lastRange = getMonthDateRange(monthTokens[monthTokens.length - 1]);
      if (firstRange && lastRange) {
        monthRange = {
          startOfMonth: firstRange.startOfMonth,
          endOfMonth: lastRange.endOfMonth,
        };
        const firstLabel = firstRange.startOfMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const lastLabel = lastRange.startOfMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        billingMonthLabel = `${firstLabel} – ${lastLabel}`;
        billingPeriodLabel = `${firstRange.startOfMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} – ${lastRange.endOfMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        statementDate = lastRange.endOfMonth.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        if (selectedIds.length === 0) {
          rawProjects = rawProjects.filter((p) => {
            const pDate = new Date(p.startDate || p.createdAt || 0);
            return monthTokens.some((token) => {
              const r = getMonthDateRange(token);
              return r && pDate >= r.startOfMonth && pDate <= r.endOfMonth;
            });
          });
        }

        rawPayments = rawPayments.filter((pm) => {
          const pmDate = new Date(pm.paymentDate || pm.createdAt || 0);
          return pmDate <= lastRange.endOfMonth;
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

    // Allocate client payments across projects
    const projectPaymentsMap = new Map<string, number>();
    for (const pm of rawPayments) {
      if (pm.projectId) {
        const pid = pm.projectId.toString();
        projectPaymentsMap.set(pid, round2((projectPaymentsMap.get(pid) || 0) + fromDecimal(pm.amount)));
      }
    }

    let generalPaymentsPool = round2(
      rawPayments
        .filter((pm) => !pm.projectId)
        .reduce((sum, pm) => sum + fromDecimal(pm.amount), 0)
    );

    // Fetch all client projects sorted chronologically to allocate general client payments
    const allClientProjects = await Project.find({ clientId: client._id }).sort({ createdAt: 1, startDate: 1 });
    for (const p of allClientProjects) {
      if (generalPaymentsPool <= 0) break;
      const pid = p._id.toString();
      const val = fromDecimal(p.projectValue);
      const cur = projectPaymentsMap.get(pid) || 0;
      const take = Math.min(generalPaymentsPool, Math.max(0, round2(val - cur)));
      if (take > 0) {
        projectPaymentsMap.set(pid, round2(cur + take));
        generalPaymentsPool = round2(generalPaymentsPool - take);
      }
    }

    const projects = rawProjects.map((p) => {
      const pIdStr = String(p._id);
      const paid = projectPaymentsMap.get(pIdStr) || 0;
      const val = fromDecimal(p.projectValue);
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
        balance: Math.max(0, round2(val - paid)),
        startDate: p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : undefined,
        deadline: p.deadline ? new Date(p.deadline).toLocaleDateString('en-IN') : undefined,
      };
    });

    const subtotal = round2(
      projects.reduce((sum, p) => sum + p.projectValue, 0)
    );
    const taxAmount = round2((subtotal * taxPercent) / 100);
    const totalRevenue = round2(subtotal + taxAmount - discountAmount);

    const totalPaid = Math.min(
      totalRevenue,
      round2(projects.reduce((sum, p) => sum + p.paidAmount, 0))
    );

    // Deductions handling
    let deductionsList: any[] = [];
    if (req.query.deductions) {
      try {
        const parsed = JSON.parse(req.query.deductions as string);
        if (Array.isArray(parsed)) deductionsList = parsed;
      } catch {}
    } else if (client.deductions && client.deductions.length > 0) {
      deductionsList = client.deductions.map((d: any) => ({
        projectName: d.projectName || d.label || 'Project Deduction',
        date: d.date ? new Date(d.date).toLocaleDateString('en-IN') : undefined,
        amount: Number(d.amount) || 0,
      }));
    }
    const totalDeductionsAmount = round2(deductionsList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0));
    const pendingBalance = Math.max(0, round2(totalRevenue - totalPaid - totalDeductionsAmount));

    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sept', 'oct', 'nov', 'dec'];
    let targetDate = monthRange ? monthRange.startOfMonth : new Date();
    if (!monthRange && customDateParam) {
      const parsed = new Date(customDateParam.includes('T') ? customDateParam : `${customDateParam}T00:00:00`);
      if (!isNaN(parsed.getTime())) targetDate = parsed;
    }
    let fileName = '';
    if (monthTokens.length > 1 && monthRange) {
      const firstSlug = monthNames[monthRange.startOfMonth.getMonth()];
      const lastSlug = monthNames[monthRange.endOfMonth.getMonth()];
      const yearSlug = monthRange.endOfMonth.getFullYear();
      fileName = `Aagspire_invoice_${firstSlug}_${lastSlug}_${yearSlug}.pdf`;
    } else {
      const monthSlug = monthNames[targetDate.getMonth()];
      const yearSlug = targetDate.getFullYear();
      fileName = `Aagspire_invoice_${monthSlug}_${yearSlug}.pdf`;
    }

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
        billingMonth: billingMonthLabel,
        billingPeriod: billingPeriodLabel,
        subtotal,
        taxPercent,
        taxAmount,
        discountAmount,
        totalRevenue,
        totalPaid,
        pendingBalance,
        notes,
        projects,
        deductions: deductionsList,
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
