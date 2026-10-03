import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadClientStatementPdf } from '../dist/controllers/client.controller.js';
import { Client } from '../dist/models/Client.js';
import { Project } from '../dist/models/Project.js';
import { ClientPayment } from '../dist/models/ClientPayment.js';
import { InvoicePreview } from '../dist/models/InvoicePreview.js';

test('invoice preview and saved PDF snapshot exclude bad debt but retain payments and deductions', async t => {
  const client = {
    _id: 'client-1', clientCode: 'CL001', name: 'Invoice test',
    deductions: [{ projectName: 'Agreed adjustment', amount: 10, date: '2026-10-03' }],
    badDebts: [],
  };
  const projects = [{ _id: 'project-1', projectCode: 'P001', projectName: 'Design', projectValue: 1000, startDate: '2026-10-01' }];
  const payments = [{ projectId: 'project-1', amount: 100, paymentDate: '2026-10-02' }];
  const query = values => Object.assign(Promise.resolve(values), { sort: async () => values });
  let saved;
  t.mock.method(Client, 'findById', async () => client);
  t.mock.method(Project, 'find', () => query(projects));
  t.mock.method(ClientPayment, 'find', () => query(payments));
  t.mock.method(InvoicePreview, 'create', async snapshot => { saved = snapshot; return { _id: 'preview-1' }; });

  for (const month of ['', '2026-10']) {
    for (const amount of [0, 200, 5000]) {
      client.badDebts = [{ projectName: 'Internal write-off', amount, date: '2026-10-03' }];
      let response;
      let status = 200;
      const res = {
        status(code) { status = code; return this; },
        json(body) { response = body; return this; },
      };
      await downloadClientStatementPdf({
        params: { id: client._id }, query: {},
        body: { projectIds: ['project-1'], month },
        path: '/clients/client-1/invoice-preview', user: { _id: 'admin-1' },
      }, res);

      assert.equal(status, 200, response?.message);
      assert.equal(response.totals.totalRevenue, 1000);
      assert.equal(response.totals.totalPaid, 100);
      assert.equal(response.totals.pendingBalance, 890);
      assert.equal(saved.data.pendingBalance, 890);
      assert.deepEqual(saved.data.deductions.map(d => d.amount), [10]);
      assert.ok(saved.html.includes('Agreed adjustment'));
      assert.ok(!saved.html.includes('Bad Debt'));
      assert.ok(!saved.html.includes('Internal write-off'));
      assert.equal(response.html, saved.html);
      assert.equal(client.badDebts[0].amount, amount);
    }
  }
});
