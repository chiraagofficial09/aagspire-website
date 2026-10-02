import assert from 'node:assert/strict';
import test from 'node:test';
import { buildClientBlocks, buildClientSheetRequests } from '../src/services/clientProjectSheet.js';
import { buildDashboardData, buildDashboardRequests, CLIENT_REPORT_START_ROW } from '../src/services/clientSheetDashboard.js';

test('dashboard reconciles client balances without netting advances and respects India month boundaries', () => {
  const clients = [{ _id: 'a', name: 'Alpha' }, { _id: 'b', name: 'Beta' }];
  const projects = [
    { clientId: 'a', projectName: 'Late', projectValue: 1000, status: 'in_process', startDate: new Date('2026-09-30T20:00:00Z'), deadline: new Date('2026-09-29') },
    { clientId: 'b', projectName: 'Done', projectValue: 500, status: 'delivered', createdAt: new Date('2026-09-10'), deadline: new Date('2026-09-20') },
  ];
  const payments = [{ clientId: 'a', amount: 200, paymentDate: new Date('2026-09-30T18:00:00Z') }, { clientId: 'b', amount: 800, paymentDate: new Date('2026-10-01') }];
  const blocks = buildClientBlocks(clients, projects, payments);
  const data = buildDashboardData(blocks, clients, projects, payments, new Date('2026-10-02T10:00:00Z'));
  assert.equal(data.total, 1500);
  assert.equal(data.received, 1000);
  assert.equal(data.pending, 800);
  assert.equal(data.credit, 300);
  assert.equal(data.activeCount, 1);
  assert.equal(data.months.at(-1)?.value, 1000);
  assert.equal(data.months.at(-1)?.collected, 800);
  assert.equal(data.months.at(-2)?.collected, 200);
  assert.equal(data.pendingClients[0].name, 'Alpha');
});

test('dashboard refresh replaces charts and places client tables below the dashboard without overlapping merges', () => {
  const clients = [{ _id: 'a', name: 'Alpha' }];
  const blocks = buildClientBlocks(clients, [], []);
  const data = buildDashboardData(blocks, clients, [], [], new Date('2026-10-02'));
  const report = buildClientSheetRequests(1, blocks, 1, 1, CLIENT_REPORT_START_ROW);
  const dashboard = buildDashboardRequests(1, 2, data, [21, 22, 23, 24]);
  assert.deepEqual(dashboard.filter(r => r.deleteEmbeddedObject).map(r => r.deleteEmbeddedObject?.objectId), [21, 22, 23, 24]);
  assert.equal(dashboard.filter(r => r.addChart).length, 4);
  assert.ok(dashboard.filter(r => r.addChart).every(r => r.addChart?.chart?.spec?.hiddenDimensionStrategy === 'SHOW_ALL'));
  assert.equal(report.find(r => r.updateCells?.start)?.updateCells?.start?.rowIndex, CLIENT_REPORT_START_ROW);
  const merges = [...report, ...dashboard].flatMap(r => r.mergeCells?.range ? [r.mergeCells.range] : []);
  for (let i = 0; i < merges.length; i++) for (let j = i + 1; j < merges.length; j++) {
    const a = merges[i], b = merges[j];
    const overlaps = a.startRowIndex! < b.endRowIndex! && b.startRowIndex! < a.endRowIndex! && a.startColumnIndex! < b.endColumnIndex! && b.startColumnIndex! < a.endColumnIndex!;
    assert.equal(overlaps, false, `Overlapping merges ${i} and ${j}`);
  }
  assert.ok(!JSON.stringify(dashboard).includes('OVERDUE PROJECTS'));
  assert.ok(JSON.stringify(dashboard).includes('No pending balances'));
});

test('groups by relationship, counts direct and project payments once, and keeps duplicate names separate', () => {
  const blocks = buildClientBlocks(
    [{ _id: 'c1', name: 'Same name' }, { _id: 'c2', name: 'Same name' }, { _id: 'empty', name: 'Empty' }],
    [
      { clientId: 'c1', projectName: 'Later', projectValue: '50000', discountPercent: 10, startDate: new Date('2026-10-03'), status: 'in_process' },
      { clientId: 'c1', projectName: 'Earlier', projectValue: { $numberDecimal: '30000' }, discountAmount: '1000', createdAt: new Date('2026-10-01'), status: 'delivered' },
      { clientId: 'c2', projectName: '=Not a formula', projectValue: 1000, status: 'in_changes' },
    ],
    [{ clientId: 'c1', amount: 20000 }, { clientId: 'c1', amount: '10000' }, { clientId: 'c2', amount: 1500 }],
  );
  assert.equal(blocks[0].projects.length, 0);
  const first = blocks.find(b => b.projects.some(p => p.name === 'Earlier'))!;
  assert.equal(first.total, 74000);
  assert.equal(first.received, 30000);
  assert.equal(first.pending, 44000);
  assert.deepEqual(first.projects.map(p => p.name), ['Earlier', 'Later']);
  assert.equal(first.projects[0].date, '01-Oct-2026');
  const second = blocks.find(b => b.projects.some(p => p.name.startsWith('=')))!;
  assert.equal(second.pending, 0);
  assert.equal(second.credit, 500);
  assert.equal(second.projects[0].date, '');
});

test('writes side-by-side blocks without IDs or executable user formulas and resets old generated cells', () => {
  const blocks = buildClientBlocks(
    [{ _id: 'secret-client-id', name: '=SUM(A1)' }, { _id: 'second-id', name: 'Second' }],
    [{ clientId: 'secret-client-id', projectName: '=HYPERLINK("x")', projectValue: 100, status: 'delivered' }], [],
  );
  const requests = buildClientSheetRequests(42, blocks, 100, 50);
  const writes = requests.filter(r => r.updateCells?.start).map(r => r.updateCells!);
  assert.deepEqual(writes.map(w => w.start?.columnIndex), [0, 7]);
  const serialized = JSON.stringify(requests);
  assert.ok(!serialized.includes('secret-client-id'));
  assert.ok(!serialized.includes('second-id'));
  assert.ok(!serialized.includes('formulaValue'));
  assert.ok(serialized.includes('stringValue'));
  const reset = requests.find(r => r.updateCells?.range)?.updateCells;
  assert.equal(reset?.range?.endRowIndex, 100);
  assert.equal(reset?.range?.endColumnIndex, 50);
  assert.equal(requests.filter(r => r.unmergeCells).length, 1);
  for (const req of requests) {
    const range = req.mergeCells?.range;
    if (range) {
      assert.ok(range.endRowIndex! <= 100);
      assert.ok(range.endColumnIndex! <= 50);
    }
  }
});

test('empty report clears previous data and displays a useful message', () => {
  const requests = buildClientSheetRequests(42, [], 100, 50);
  assert.ok(JSON.stringify(requests).includes('No clients yet'));
  assert.ok(requests.some(r => r.updateCells?.range?.endColumnIndex === 50));
});

test('client advance exists even when the client has no projects', () => {
  const [block] = buildClientBlocks([{ _id: 'a', name: 'Advance client' }], [], [{ clientId: 'a', amount: 250 }]);
  assert.equal(block.received, 250);
  assert.equal(block.credit, 250);
  assert.equal(block.pending, 0);
  const requests = buildClientSheetRequests(1, [block]);
  assert.ok(JSON.stringify(requests).includes('Advance / Credit'));
});
