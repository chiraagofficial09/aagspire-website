import type { sheets_v4 } from 'googleapis';
import type { ClientBlock, PaymentRow, ProjectRow } from './clientProjectSheet.js';
import { getNetProjectValue } from './dashboardFinance.js';
import { fromDecimal, round2 } from '../utils/decimalHelper.js';

export const CLIENT_REPORT_START_ROW = 42;
export const DASHBOARD_DATA_TITLE = '_Aagspire Dashboard Data';

// Business dates and month boundaries consistently use India time.
function dayKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function buildDashboardData(blocks: ClientBlock[], clients: { _id: unknown; name: string; companyName?: string }[], projects: ProjectRow[], payments: PaymentRow[], now = new Date()) {
  const names = new Map(clients.map(c => [String(c._id), c.companyName || c.name]));
  const relatedProjects = projects.filter(p => names.has(String(p.clientId)));
  const relatedPayments = payments.filter(p => names.has(String(p.clientId)));
  const today = dayKey(now);
  const [year, month] = today.split('-').map(Number);
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 6 + index, 1));
    return { key: date.toISOString().slice(0, 7), label: date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }), value: 0, collected: 0 };
  });
  for (const project of relatedProjects) {
    const date = project.startDate || project.createdAt;
    if (!date) continue;
    const bucket = months.find(m => m.key === dayKey(new Date(date)).slice(0, 7));
    if (bucket) bucket.value = round2(bucket.value + getNetProjectValue(project));
  }
  for (const payment of relatedPayments) {
    const date = payment.paymentDate || payment.createdAt;
    if (!date) continue;
    const bucket = months.find(m => m.key === dayKey(new Date(date)).slice(0, 7));
    if (bucket) bucket.collected = round2(bucket.collected + fromDecimal(payment.amount));
  }
  const statuses = new Map<string, number>();
  for (const block of blocks) for (const project of block.projects) statuses.set(project.status, (statuses.get(project.status) || 0) + 1);
  const topClients = [...blocks].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const pendingClients = [...blocks].filter(b => b.pending > 0).sort((a, b) => b.pending - a.pending || a.name.localeCompare(b.name)).slice(0, 5);
  const sum = (key: 'total' | 'received' | 'pending' | 'credit') => round2(blocks.reduce((n, b) => n + b[key], 0));
  return {
    clientCount: blocks.length, projectCount: relatedProjects.length,
    activeCount: relatedProjects.filter(p => p.status !== 'delivered').length,
    total: sum('total'), received: sum('received'), pending: sum('pending'), credit: sum('credit'),
    months, statuses: [...statuses], topClients, pendingClients,
    updated: now.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }),
  };
}

export function buildDashboardRequests(sheetId: number, dataSheetId: number, data: ReturnType<typeof buildDashboardData>, oldChartIds: number[] = []): sheets_v4.Schema$Request[] {
  const requests: sheets_v4.Schema$Request[] = oldChartIds.map(objectId => ({ deleteEmbeddedObject: { objectId } }));
  const orange = { red: 1, green: 0.35, blue: 0.12 };
  const darkNavy = { red: 0.08, green: 0.12, blue: 0.20 };
  const slateText = { red: 0.09, green: 0.12, blue: 0.17 };
  const mutedText = { red: 0.40, green: 0.45, blue: 0.53 };
  const receivedBlue = { red: 0.11, green: 0.35, blue: 0.72 };
  const white = { red: 1, green: 1, blue: 1 };
  const cardBg = { red: 0.97, green: 0.98, blue: 0.99 };
  const headerBg = { red: 0.94, green: 0.95, blue: 0.97 };
  const line = { style: 'SOLID', color: { red: 0.88, green: 0.90, blue: 0.93 } };
  const currency = { type: 'NUMBER', pattern: '"₹"#,##0.00' };
  const range = (row: number, end: number, col: number, endCol: number) => ({ sheetId, startRowIndex: row, endRowIndex: end, startColumnIndex: col, endColumnIndex: endCol });
  const write = (targetId: number, row: number, col: number, values: (string | number)[][]) => requests.push({ updateCells: {
    start: { sheetId: targetId, rowIndex: row, columnIndex: col }, fields: 'userEnteredValue',
    rows: values.map(values => ({ values: values.map(value => ({ userEnteredValue: typeof value === 'number' ? { numberValue: value } : { stringValue: value } })) })),
  } });
  const format = (row: number, end: number, col: number, endCol: number, value: sheets_v4.Schema$CellFormat) => requests.push({ repeatCell: {
    range: range(row, end, col, endCol), cell: { userEnteredFormat: value }, fields: Object.keys(value).map(k => `userEnteredFormat.${k}`).join(','),
  } });
  const merged = (row: number, col: number, endCol: number, value: string | number) => {
    requests.push({ mergeCells: { range: range(row, row + 1, col, endCol), mergeType: 'MERGE_ALL' } });
    write(sheetId, row, col, [[value]]);
  };
  // Also size these columns when there are fewer than two clients.
  [140, 260, 220, 160, 26, 26, 26, 140, 260, 220, 160].forEach((pixelSize, col) => requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: col, endIndex: col + 1 }, properties: { pixelSize }, fields: 'pixelSize' } }));
  merged(0, 0, 11, 'AAGSPIRE | BUSINESS DASHBOARD');
  format(0, 1, 0, 11, { backgroundColor: darkNavy, textFormat: { bold: true, fontSize: 18, foregroundColor: white } });
  merged(1, 0, 11, `All-time overview · Last synced: ${data.updated} IST · Monthly charts: last 6 months`);
  format(1, 2, 0, 11, { backgroundColor: cardBg, textFormat: { fontSize: 11, foregroundColor: mutedText } });
  const cards: [string, number, number, number, number, boolean][] = [
    ['Total Clients', data.clientCount, 3, 0, 2, false], ['Total Projects', data.projectCount, 3, 2, 4, false], ['Active Projects', data.activeCount, 3, 7, 11, false],
    ['Total Project Value', data.total, 6, 0, 2, true], ['Total Received', data.received, 6, 2, 4, true], ['Total Pending', data.pending, 6, 7, 11, true],
  ];
  for (const [label, value, row, col, endCol, money] of cards) {
    merged(row, col, endCol, label); merged(row + 1, col, endCol, value);
    format(row, row + 2, col, endCol, { backgroundColor: cardBg, horizontalAlignment: 'CENTER', textFormat: { bold: true, fontSize: 11, foregroundColor: mutedText } });
    format(row + 1, row + 2, col, endCol, { textFormat: { bold: true, fontSize: 22, foregroundColor: label === 'Total Received' ? receivedBlue : label === 'Total Pending' ? orange : darkNavy }, ...(money ? { numberFormat: currency } : {}) });
    requests.push({ updateBorders: { range: range(row, row + 2, col, endCol), top: line, bottom: line, left: line, right: line } });
  }
  merged(9, 0, 11, `Advance / Credit: ₹${data.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })} · Client advances do not reduce another client's pending balance.`);
  format(9, 10, 0, 11, { textFormat: { fontSize: 10, foregroundColor: mutedText } });

  // Hidden supporting tab contains names and aggregates only; charts include hidden data.
  requests.push({ updateSheetProperties: { properties: { sheetId: dataSheetId, hidden: true, gridProperties: { rowCount: 20, columnCount: 16 } }, fields: 'hidden,gridProperties.rowCount,gridProperties.columnCount' } });
  requests.push({ updateCells: { range: { sheetId: dataSheetId }, fields: 'userEnteredValue' } });
  const chartClients = data.topClients.slice(0, 10);
  const monthly = [['Month', 'Project Value', 'Collection'], ...data.months.map(m => [m.label, m.value, m.collected])];
  const clients = [['Client', 'Received', 'Pending'], ...(chartClients.length ? chartClients.map(c => [c.name, c.received, c.pending]) : [['No clients', 0, 0]])];
  // Keep counts beside the matching color markers in a compact side legend.
  const statuses = [['Status', 'Projects'], ...(data.statuses.length ? data.statuses.map(([status, count]) => [`${count}  ${status}`, count]) : [['0  No projects', 0]])];
  const top = [['Client', 'Project Value'], ...(data.topClients.length ? data.topClients.slice(0, 5).map(c => [c.name, c.total]) : [['No clients', 0]])];
  write(dataSheetId, 0, 0, monthly); write(dataSheetId, 0, 5, clients); write(dataSheetId, 0, 10, statuses); write(dataSheetId, 0, 14, top);
  const source = (col: number, count: number): sheets_v4.Schema$ChartData => ({ sourceRange: { sources: [{ sheetId: dataSheetId, startRowIndex: 0, endRowIndex: count, startColumnIndex: col, endColumnIndex: col + 1 }] } });
  const chart = (title: string, row: number, col: number, spec: sheets_v4.Schema$ChartSpec) => requests.push({ addChart: { chart: {
    spec: { title, fontName: 'Arial', hiddenDimensionStrategy: 'SHOW_ALL', backgroundColor: white, ...spec },
    position: { overlayPosition: { anchorCell: { sheetId, rowIndex: row, columnIndex: col }, widthPixels: 710, heightPixels: 350 } },
  } } });
  chart('Monthly Project Value & Collection (INR)', 10, 0, { basicChart: {
    chartType: 'COLUMN', headerCount: 1, legendPosition: 'BOTTOM_LEGEND',
    domains: [{ domain: source(0, monthly.length) }],
    series: [{ series: source(1, monthly.length), targetAxis: 'LEFT_AXIS', color: orange }, { series: source(2, monthly.length), targetAxis: 'LEFT_AXIS', color: receivedBlue }],
    axis: [{ position: 'LEFT_AXIS', title: 'INR' }],
  } });
  chart(`Client Received & Pending${data.clientCount > 10 ? ' — Top 10 by Value' : ''} (INR)`, 10, 7, { basicChart: {
    chartType: 'BAR', stackedType: 'STACKED', headerCount: 1, legendPosition: 'BOTTOM_LEGEND',
    domains: [{ domain: source(5, clients.length) }],
    series: [{ series: source(6, clients.length), targetAxis: 'BOTTOM_AXIS', color: receivedBlue }, { series: source(7, clients.length), targetAxis: 'BOTTOM_AXIS', color: orange }],
    axis: [{ position: 'BOTTOM_AXIS', title: 'INR' }],
  } });
  chart(data.projectCount ? 'Project Status' : 'Project Status — No projects yet', 21, 0, { subtitle: `Total Projects: ${data.projectCount}`, pieChart: { legendPosition: 'RIGHT_LEGEND', pieHole: 0.65, domain: source(10, statuses.length), series: source(11, statuses.length) } });
  chart('Top 5 Clients by Project Value (INR)', 21, 7, { basicChart: {
    chartType: 'BAR', headerCount: 1, legendPosition: 'NO_LEGEND', domains: [{ domain: source(14, top.length) }],
    series: [{ series: source(15, top.length), targetAxis: 'BOTTOM_AXIS', color: orange }], axis: [{ position: 'BOTTOM_AXIS', title: 'INR' }],
  } });

  merged(32, 0, 4, 'TOP PENDING CLIENTS');
  format(32, 34, 0, 4, { backgroundColor: headerBg, textFormat: { bold: true, foregroundColor: slateText, fontSize: 12 } });
  merged(33, 0, 2, 'Client'); merged(33, 2, 4, 'Pending Amount');
  for (let i = 0; i < 5; i++) {
    const pending = data.pendingClients[i];
    merged(34 + i, 0, 2, pending?.name || (i === 0 ? 'No pending balances' : ''));
    merged(34 + i, 2, 4, pending?.pending ?? '');
  }
  format(34, 39, 2, 4, { numberFormat: currency, textFormat: { bold: true, foregroundColor: orange } });
  requests.push({ updateBorders: { range: range(33, 39, 0, 4), top: line, bottom: line, left: line, right: line, innerHorizontal: line } });
  merged(40, 0, 11, 'CLIENT PROJECTS');
  format(40, 41, 0, 11, { textFormat: { bold: true, fontSize: 20, foregroundColor: darkNavy } });
  for (const [row, size] of [[0, 52], [4, 46], [7, 46]]) requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: row, endIndex: row + 1 }, properties: { pixelSize: size }, fields: 'pixelSize' } });
  return requests;
}
