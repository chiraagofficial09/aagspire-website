import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadClientStatementPdf, getClientById } from '../dist/controllers/client.controller.js';
import { deliverInvoice } from '../dist/services/invoiceDelivery.service.js';
import { closeInvoiceBrowser } from '../dist/services/invoiceBrowser.service.js';
import { Client } from '../dist/models/Client.js';
import { Project } from '../dist/models/Project.js';
import { ClientPayment } from '../dist/models/ClientPayment.js';
import { InvoiceCounter } from '../dist/models/InvoiceCounter.js';
import { InvoicePreview } from '../dist/models/InvoicePreview.js';

test.after(async () => {
  await closeInvoiceBrowser();
});

test('deliverInvoice saves specialDiscount, taxPercent, and project invoiceDiscount to database without altering project discountAmount', async t => {
  let clientUpdate = null;
  let projectUpdates = [];
  let counterUpdate = null;

  t.mock.method(InvoiceCounter, 'findOne', async () => ({ currentNumber: 1, step: 1 }));
  t.mock.method(InvoiceCounter, 'updateOne', async (filter, update) => {
    counterUpdate = { filter, update };
    return { acknowledged: true };
  });
  t.mock.method(Client, 'updateOne', async (filter, update) => {
    clientUpdate = { filter, update };
    return { acknowledged: true };
  });
  t.mock.method(Project, 'updateOne', async (filter, update) => {
    projectUpdates.push({ filter, update });
    return { acknowledged: true };
  });

  const clientId = 'client-discount-1';
  const data = {
    invoiceNumber: 'INV-100',
    discountAmount: 150,
    taxPercent: 5,
    projects: [
      {
        projectCode: 'P-01',
        projectName: 'Web App',
        discountAmount: 50,
        subProjects: ['Frontend', 'Backend']
      }
    ]
  };

  const headers = {};
  let sentData = null;
  const res = {
    setHeader(k, v) { headers[k] = v; return this; },
    send(body) { sentData = body; return this; }
  };

  await deliverInvoice(clientId, data, '<!DOCTYPE html><html><body><main style="height:100px;">Invoice</main></body></html>', 'invoice.pdf', res);

  assert.equal(headers['X-Invoice-Number'], 'INV-100');
  assert.equal(headers['X-Next-Invoice-Number'], 'INV-101');
  assert.ok(sentData);

  // Check client persistence
  assert.deepEqual(clientUpdate.filter, { _id: clientId });
  assert.equal(clientUpdate.update.$set.lastInvoiceNumber, 'INV-100');
  assert.equal(clientUpdate.update.$set.specialDiscount, 150);
  assert.equal(clientUpdate.update.$set.taxPercent, 5);

  // Check project persistence: invoiceDiscount saved, but discountAmount NOT touched
  assert.equal(projectUpdates.length, 1);
  assert.deepEqual(projectUpdates[0].filter, { clientId, projectCode: 'P-01' });
  assert.equal(projectUpdates[0].update.$set.invoiceDiscount, 50);
  assert.equal(projectUpdates[0].update.$set.discountAmount, undefined);
  assert.deepEqual(projectUpdates[0].update.$set.subProjects, ['Frontend', 'Backend']);
  assert.equal(projectUpdates[0].update.$set.description, 'Frontend\nBackend');
});

test('downloadClientStatementPdf preserves grossProjectValue as actual cost and projectValue as net', async t => {
  const client = {
    _id: '507f1f77bcf86cd799439011',
    clientCode: 'CL002',
    name: 'Discount Client',
    specialDiscount: 200,
    taxPercent: 18,
    deductions: [],
    badDebts: [],
  };
  const projects = [
    {
      _id: '507f1f77bcf86cd799439012',
      projectCode: 'P002',
      projectName: 'Mobile App',
      projectValue: 2000,
      invoiceDiscount: 100,
      startDate: '2026-10-01'
    }
  ];

  let savedSnapshot = null;
  const query = values => Object.assign(Promise.resolve(values), { sort: async () => values });
  t.mock.method(Client, 'findById', async () => client);
  t.mock.method(Project, 'find', () => query(projects));
  t.mock.method(ClientPayment, 'find', () => query([]));
  t.mock.method(InvoicePreview, 'create', async (snap) => {
    savedSnapshot = snap;
    return { _id: 'preview-test-1' };
  });

  let response = null;
  let status = 200;
  const res = {
    status(code) { status = code; return this; },
    json(body) { response = body; return this; }
  };

  await downloadClientStatementPdf({
    params: { id: client._id },
    query: {},
    body: { projectIds: ['507f1f77bcf86cd799439012'] },
    path: '/clients/507f1f77bcf86cd799439011/invoice-preview',
    user: { _id: '507f1f77bcf86cd799439099' }
  }, res);

  assert.equal(status, 200, response?.message);
  // Special discount should be 200 from client.specialDiscount
  assert.equal(savedSnapshot.data.discountAmount, 200);
  assert.equal(savedSnapshot.data.taxPercent, 18);
  // Project gross should be actual project price + discount (2100)
  assert.equal(savedSnapshot.data.projects[0].grossProjectValue, 2100);
  // Project total after discount should be actual project value (2000)
  assert.equal(savedSnapshot.data.projects[0].projectValue, 2000);
  assert.equal(savedSnapshot.data.projects[0].discountAmount, 100);

  // Subtotal = 2000, Tax 18% of 2000 = 360, less special discount 200 -> totalRevenue = 2160
  assert.equal(response.totals.subtotal, 2000);
  assert.equal(response.totals.taxAmount, 360);
  assert.equal(response.totals.pendingBalance, 2160);
});

test('getClientById returns accurate actual contract value (projectValue) and keeps invoiceDiscount', async t => {
  const validClientId = '507f1f77bcf86cd799439011';
  const clientObj = {
    _id: validClientId,
    name: 'Test Client 3',
    specialDiscount: 75,
    taxPercent: 10,
    toObject() { return { ...this }; }
  };

  const projects = [
    {
      _id: '507f1f77bcf86cd799439021',
      clientId: validClientId,
      projectName: 'P1',
      projectValue: 1000,
      invoiceDiscount: 50,
      status: 'start_process',
      toObject() { return { ...this }; }
    },
    {
      _id: '507f1f77bcf86cd799439022',
      clientId: validClientId,
      projectName: 'P2',
      projectValue: 2000,
      discountAmount: 120,
      status: 'completed',
      toObject() { return { ...this }; }
    }
  ];

  const payments = [
    { projectId: '507f1f77bcf86cd799439021', clientId: validClientId, amount: 300, paymentStatus: 'Completed', toObject() { return { ...this }; } }
  ];

  const queryWithPopulate = values => {
    const p = Promise.resolve(values);
    p.populate = () => p;
    p.sort = () => p;
    p.lean = () => p;
    return p;
  };

  t.mock.method(Client, 'findById', async () => clientObj);
  t.mock.method(Client, 'findOne', async () => clientObj);
  t.mock.method(Client, 'find', () => queryWithPopulate([clientObj]));
  t.mock.method(Project, 'find', () => queryWithPopulate(projects));
  t.mock.method(Project, 'aggregate', async () => []);
  t.mock.method(ClientPayment, 'find', () => queryWithPopulate(payments));
  t.mock.method(ClientPayment, 'aggregate', async () => []);

  let response = null;
  let status = 200;
  const res = {
    status(code) { status = code; return this; },
    json(body) { response = body; return this; }
  };

  await getClientById({ params: { id: validClientId }, query: {} }, res);

  assert.equal(status, 200, response?.message);
  assert.equal(response.data.specialDiscount, 75);
  assert.equal(response.data.taxPercent, 10);
  const p1 = response.data.projects.find(p => p._id === '507f1f77bcf86cd799439021');
  // Actual contract price must remain 1000!
  assert.equal(p1.projectValue, 1000);
  assert.equal(p1.grossProjectValue, 1000);
  assert.equal(p1.netProjectValue, 950);
  assert.equal(p1.invoiceDiscount, 50);

  const p2 = response.data.projects.find(p => p._id === '507f1f77bcf86cd799439022');
  // Actual contract price must remain 2000!
  assert.equal(p2.projectValue, 2000);
  assert.equal(p2.grossProjectValue, 2000);
  assert.equal(p2.netProjectValue, 1880);
});
