import { Response } from 'express';
import { Types } from 'mongoose';
import { Vendor } from '../models/Vendor.js';
import { VendorWork } from '../models/VendorWork.js';
import { VendorPayment } from '../models/VendorPayment.js';
import { Client } from '../models/Client.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { generateVendorCode } from '../utils/codeGenerator.js';
import { toDecimal, fromDecimal, round2 } from '../utils/decimalHelper.js';
import { getMonthDateRange } from '../utils/dateHelper.js';
import { summarizeVendorLedger, syncVendorDeductions } from '../services/vendorLedger.service.js';

const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'cheque', 'other'];

const isValidId = (id: unknown) => typeof id === 'string' && Types.ObjectId.isValid(id);

function parseAmount(raw: unknown): number | null {
  const num = round2(parseFloat(String(raw)));
  return Number.isFinite(num) && num > 0 ? num : null;
}

function parseDate(raw: unknown): Date | null {
  if (raw === undefined || raw === null || raw === '') return new Date();
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function nextVendorCode(): Promise<string> {
  const existing = await Vendor.find({ vendorCode: { $regex: /^AAG-VEN-/ } }, { vendorCode: 1 }).lean();
  let maxSeq = 0;
  for (const v of existing) {
    const seq = parseInt(v.vendorCode.split('-').pop() || '', 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  let nextSeq = maxSeq + 1;
  let code = generateVendorCode(nextSeq);
  while (await Vendor.exists({ vendorCode: code })) {
    nextSeq++;
    code = generateVendorCode(nextSeq);
  }
  return code;
}

/** Vendor details from the request body, falling back to the linked client's details. */
function pickDetails(body: any, client?: any) {
  const name = String(body.name || body.companyName || client?.companyName || client?.name || '').trim();
  return {
    name,
    companyName: String(body.companyName || body.name || client?.companyName || client?.name || '').trim() || undefined,
    contactPerson: (body.contactPerson ?? client?.contactPerson) || undefined,
    email: (body.email ?? client?.email) || undefined,
    phone: (body.phone ?? client?.phone) || undefined,
    address: (body.address ?? client?.address) || undefined,
    gstNumber: (body.gstNumber ?? body.taxId ?? client?.gstNumber) || undefined,
    notes: body.notes || undefined,
  };
}

export async function listVendors(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const range = getMonthDateRange((req.query.month as string) || '');
    const vendors = await Vendor.find({}).populate('clientId', 'name companyName clientCode').sort({ createdAt: -1 }).lean();
    const vendorIds = vendors.map((v) => v._id);

    const [allWorks, allPayments] = await Promise.all([
      VendorWork.find({ vendorId: { $in: vendorIds } }).lean(),
      VendorPayment.find({ vendorId: { $in: vendorIds } }).lean(),
    ]);

    const worksByVendor = new Map<string, any[]>();
    for (const w of allWorks) {
      const key = String(w.vendorId);
      worksByVendor.set(key, [...(worksByVendor.get(key) || []), w]);
    }
    const paymentsByVendor = new Map<string, any[]>();
    for (const p of allPayments) {
      const key = String(p.vendorId);
      paymentsByVendor.set(key, [...(paymentsByVendor.get(key) || []), p]);
    }

    const totals = { total: 0, previousPending: 0, paid: 0, pending: 0 };
    const data = vendors.map((v) => {
      const key = String(v._id);
      const { rows: _rows, ...summary } = summarizeVendorLedger(
        worksByVendor.get(key) || [],
        paymentsByVendor.get(key) || [],
        Boolean(v.clientId),
        range
      );
      totals.total = round2(totals.total + summary.total);
      totals.previousPending = round2(totals.previousPending + summary.previousPending);
      totals.paid = round2(totals.paid + summary.paid);
      totals.pending = round2(totals.pending + summary.pending);
      return { ...v, linkedClient: v.clientId || null, clientId: (v.clientId as any)?._id || v.clientId || null, summary };
    });

    res.json({ success: true, count: data.length, vendors: data, data, totals });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createVendor(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let client: any = null;
    if (req.body.clientId) {
      if (!isValidId(req.body.clientId)) {
        res.status(400).json({ success: false, message: 'Invalid client.' });
        return;
      }
      client = await Client.findById(req.body.clientId).lean();
      if (!client) {
        res.status(404).json({ success: false, message: 'Client not found.' });
        return;
      }
      const existing = await Vendor.findOne({ clientId: client._id }).lean();
      if (existing) {
        res.status(400).json({ success: false, message: `This client is already added as vendor (${existing.vendorCode}).` });
        return;
      }
    }

    const details = pickDetails(req.body, client);
    if (!details.name) {
      res.status(400).json({ success: false, message: 'Vendor name is required.' });
      return;
    }

    const vendor = await Vendor.create({
      ...details,
      vendorCode: await nextVendorCode(),
      clientId: client?._id,
      status: 'active',
      createdBy: req.user!._id,
    });

    res.status(201).json({ success: true, message: 'Vendor created successfully.', vendor, data: vendor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getVendorById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!isValidId(req.params.id)) {
      res.status(404).json({ success: false, message: 'Vendor not found.' });
      return;
    }
    const vendor = await Vendor.findById(req.params.id).populate('clientId', 'name companyName clientCode').lean();
    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendor not found.' });
      return;
    }

    const range = getMonthDateRange((req.query.month as string) || '');
    const [works, payments] = await Promise.all([
      VendorWork.find({ vendorId: vendor._id }).sort({ workDate: -1, createdAt: -1 }).lean(),
      VendorPayment.find({ vendorId: vendor._id })
        .populate('vendorWorkId', 'title')
        .sort({ paymentDate: -1, createdAt: -1 })
        .lean(),
    ]);

    const { rows, ...summary } = summarizeVendorLedger(works, payments, Boolean(vendor.clientId), range);
    const rowById = new Map(rows.map((r) => [r.workId, r]));

    const data = {
      ...vendor,
      linkedClient: vendor.clientId || null,
      clientId: (vendor.clientId as any)?._id || vendor.clientId || null,
      summary,
      works: works.map((w) => {
        const row = rowById.get(String(w._id));
        return {
          ...w,
          amount: fromDecimal(w.amount),
          cashPaid: row?.cashPaid || 0,
          adjusted: row?.adjusted || 0,
          pending: row?.pending || 0,
        };
      }),
      payments: payments.map((p) => ({ ...p, amount: fromDecimal(p.amount) })),
    };

    res.json({ success: true, data, vendor: data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateVendor(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = isValidId(req.params.id) ? await Vendor.findById(req.params.id) : null;
    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendor not found.' });
      return;
    }

    const fields = ['name', 'companyName', 'contactPerson', 'email', 'phone', 'address', 'notes'] as const;
    for (const f of fields) {
      if (req.body[f] !== undefined) (vendor as any)[f] = req.body[f];
    }
    const gst = req.body.gstNumber ?? req.body.taxId;
    if (gst !== undefined) vendor.gstNumber = gst;
    if (req.body.name && !req.body.companyName) vendor.companyName = req.body.name;
    if (req.body.status && ['active', 'inactive'].includes(req.body.status)) vendor.status = req.body.status;

    let linkChanged = false;
    if (req.body.clientId !== undefined) {
      const newClientId = req.body.clientId || null;
      if (newClientId) {
        if (!isValidId(newClientId) || !(await Client.exists({ _id: newClientId }))) {
          res.status(404).json({ success: false, message: 'Client not found.' });
          return;
        }
        const taken = await Vendor.findOne({ clientId: newClientId, _id: { $ne: vendor._id } }).lean();
        if (taken) {
          res.status(400).json({ success: false, message: `This client is already linked to vendor ${taken.vendorCode}.` });
          return;
        }
      }
      linkChanged = String(vendor.clientId || '') !== String(newClientId || '');
      vendor.clientId = newClientId ? new Types.ObjectId(newClientId) : undefined;
    }

    if (!vendor.name?.trim()) {
      res.status(400).json({ success: false, message: 'Vendor name is required.' });
      return;
    }

    await vendor.save();
    if (linkChanged) await syncVendorDeductions(vendor._id);

    res.json({ success: true, message: 'Vendor updated.', vendor, data: vendor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteVendor(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = isValidId(req.params.id) ? await Vendor.findById(req.params.id) : null;
    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendor not found.' });
      return;
    }
    await Promise.all([
      VendorWork.deleteMany({ vendorId: vendor._id }),
      VendorPayment.deleteMany({ vendorId: vendor._id }),
      Vendor.deleteOne({ _id: vendor._id }),
    ]);
    // Removes this vendor's auto deductions from the linked client's bill
    await syncVendorDeductions(vendor._id);
    res.json({ success: true, message: `Vendor ${vendor.name} deleted successfully.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function findVendorOr404(req: AuthenticatedRequest, res: Response) {
  const vendor = isValidId(req.params.id) ? await Vendor.findById(req.params.id).lean() : null;
  if (!vendor) res.status(404).json({ success: false, message: 'Vendor not found.' });
  return vendor;
}

export async function addVendorWork(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = await findVendorOr404(req, res);
    if (!vendor) return;
    const title = String(req.body.title || '').trim();
    const amount = parseAmount(req.body.amount);
    const date = parseDate(req.body.workDate ?? req.body.date);
    if (!title || amount === null || !date) {
      res.status(400).json({ success: false, message: 'Project title, a valid amount and date are required.' });
      return;
    }
    const work = await VendorWork.create({
      vendorId: vendor._id,
      title,
      description: req.body.description ? String(req.body.description).trim() : undefined,
      amount: toDecimal(amount),
      workDate: date,
      adjustInClientBill: req.body.adjustInClientBill !== false,
      createdBy: req.user!._id,
    });
    await syncVendorDeductions(vendor._id);
    res.status(201).json({ success: true, message: 'Project added.', data: work });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateVendorWork(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = await findVendorOr404(req, res);
    if (!vendor) return;
    const work = isValidId(req.params.workId)
      ? await VendorWork.findOne({ _id: req.params.workId, vendorId: vendor._id })
      : null;
    if (!work) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }
    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim();
      if (!title) {
        res.status(400).json({ success: false, message: 'Project title is required.' });
        return;
      }
      work.title = title;
    }
    if (req.body.amount !== undefined) {
      const amount = parseAmount(req.body.amount);
      if (amount === null) {
        res.status(400).json({ success: false, message: 'Amount must be greater than 0.' });
        return;
      }
      work.amount = toDecimal(amount);
    }
    const rawDate = req.body.workDate ?? req.body.date;
    if (rawDate !== undefined) {
      const date = parseDate(rawDate);
      if (!date) {
        res.status(400).json({ success: false, message: 'Invalid date.' });
        return;
      }
      work.workDate = date;
    }
    if (req.body.description !== undefined) work.description = String(req.body.description).trim();
    if (req.body.adjustInClientBill !== undefined) work.adjustInClientBill = Boolean(req.body.adjustInClientBill);
    await work.save();
    await syncVendorDeductions(vendor._id);
    res.json({ success: true, message: 'Project updated.', data: work });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteVendorWork(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = await findVendorOr404(req, res);
    if (!vendor) return;
    const result = isValidId(req.params.workId)
      ? await VendorWork.deleteOne({ _id: req.params.workId, vendorId: vendor._id })
      : { deletedCount: 0 };
    if (!result.deletedCount) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }
    // Payments tied to this project stay, and are re-allocated to the other projects
    await VendorPayment.updateMany({ vendorId: vendor._id, vendorWorkId: req.params.workId }, { $unset: { vendorWorkId: 1 } });
    await syncVendorDeductions(vendor._id);
    res.json({ success: true, message: 'Project deleted.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function addVendorPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = await findVendorOr404(req, res);
    if (!vendor) return;
    const amount = parseAmount(req.body.amount);
    const date = parseDate(req.body.paymentDate ?? req.body.date);
    if (amount === null || !date) {
      res.status(400).json({ success: false, message: 'A valid amount and date are required.' });
      return;
    }
    let vendorWorkId: Types.ObjectId | undefined;
    if (req.body.vendorWorkId) {
      const work = isValidId(req.body.vendorWorkId)
        ? await VendorWork.exists({ _id: req.body.vendorWorkId, vendorId: vendor._id })
        : null;
      if (!work) {
        res.status(400).json({ success: false, message: 'Selected project does not belong to this vendor.' });
        return;
      }
      vendorWorkId = new Types.ObjectId(req.body.vendorWorkId);
    }
    const method = PAYMENT_METHODS.includes(req.body.paymentMethod) ? req.body.paymentMethod : 'cash';
    const payment = await VendorPayment.create({
      vendorId: vendor._id,
      vendorWorkId,
      amount: toDecimal(amount),
      paymentDate: date,
      paymentMethod: method,
      notes: req.body.notes ? String(req.body.notes).trim() : undefined,
      createdBy: req.user!._id,
    });
    await syncVendorDeductions(vendor._id);
    res.status(201).json({ success: true, message: 'Payment recorded.', data: payment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteVendorPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = await findVendorOr404(req, res);
    if (!vendor) return;
    const result = isValidId(req.params.paymentId)
      ? await VendorPayment.deleteOne({ _id: req.params.paymentId, vendorId: vendor._id })
      : { deletedCount: 0 };
    if (!result.deletedCount) {
      res.status(404).json({ success: false, message: 'Payment not found.' });
      return;
    }
    await syncVendorDeductions(vendor._id);
    res.json({ success: true, message: 'Payment deleted.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
