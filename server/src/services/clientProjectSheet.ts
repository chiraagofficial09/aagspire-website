import type { sheets_v4 } from 'googleapis';
import { fromDecimal, round2 } from '../utils/decimalHelper.js';
import { getNetProjectValue } from './dashboardFinance.js';

type ClientRow = { _id: unknown; name: string; companyName?: string };
export type ProjectRow = { clientId: unknown; projectName: string; projectValue: unknown; discountAmount?: unknown; discountPercent?: number; startDate?: Date; createdAt?: Date; deadline?: Date; status: string; assignedEmployees?: unknown[] };
export type PaymentRow = { clientId: unknown; amount: unknown; paymentDate?: Date; createdAt?: Date };

export function buildClientBlocks(clients: ClientRow[], projects: ProjectRow[], payments: PaymentRow[]) {
  const projectsByClient = new Map<string, ProjectRow[]>();
  const receivedByClient = new Map<string, number>();
  for (const project of projects) {
    const key = String(project.clientId);
    const group = projectsByClient.get(key) || [];
    group.push(project);
    projectsByClient.set(key, group);
  }
  for (const payment of payments) {
    const key = String(payment.clientId);
    receivedByClient.set(key, round2((receivedByClient.get(key) || 0) + fromDecimal(payment.amount)));
  }
  const dateOf = (project: ProjectRow) => new Date(project.startDate || project.createdAt || 0).getTime();
  const labels: Record<string, string> = { start_process: 'Not Started', in_process: 'In Progress', in_changes: 'In Changes', delivered: 'Delivered' };
  return clients.map(client => {
    const related = (projectsByClient.get(String(client._id)) || []).slice().sort((a, b) => dateOf(a) - dateOf(b));
    const total = round2(related.reduce((sum, project) => sum + getNetProjectValue(project), 0));
    const received = receivedByClient.get(String(client._id)) || 0;
    return {
      name: client.companyName || client.name,
      contact: client.companyName && client.companyName !== client.name ? client.name : '',
      projects: related.map(project => {
        const assignedNames = Array.isArray(project.assignedEmployees)
          ? project.assignedEmployees
              .map((e: any) => e?.fullName || e?.name || (typeof e === 'string' ? e : ''))
              .filter(Boolean)
          : [];
        return {
          date: project.startDate || project.createdAt
            ? new Date(project.startDate || project.createdAt!).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).replace(/ /g, '-') : '',
          name: project.projectName,
          assignedTo: assignedNames.length > 0 ? assignedNames.join(', ') : 'Unassigned',
          value: getNetProjectValue(project),
          status: labels[project.status] || project.status.replace(/_/g, ' '),
        };
      }),
      total, received,
      pending: Math.max(0, round2(total - received)),
      credit: Math.max(0, round2(received - total)),
    };
  }).sort((a, b) => a.name.localeCompare(b.name) || a.contact.localeCompare(b.contact));
}

export type ClientBlock = ReturnType<typeof buildClientBlocks>[number];

/** Five columns per client, with two blank spacer columns. */
export function buildClientSheetRequests(sheetId: number, blocks: ClientBlock[], previousRows = 1, previousColumns = 1, rowOffset = 0) {
  const orange = { red: 1, green: 0.39, blue: 0.04 };
  const pendingText = { red: 0.8, green: 0.24, blue: 0.01 };
  const peach = { red: 1, green: 0.94, blue: 0.9 };
  const mint = { red: 0.91, green: 0.98, blue: 0.95 };
  const stripe = { red: 0.96, green: 0.97, blue: 0.98 };
  const black = { red: 0.12, green: 0.12, blue: 0.12 };
  const green = { red: 0.02, green: 0.43, blue: 0.28 };
  const text = { red: 0.12, green: 0.14, blue: 0.18 };
  const background = { red: 1, green: 1, blue: 1 };
  const border = { red: 0.86, green: 0.88, blue: 0.9 };
  const currency = { type: 'NUMBER', pattern: '"₹"#,##0.00' };
  const rows = rowOffset + Math.max(14, ...blocks.map(b => Math.max(1, b.projects.length) + 11));
  const columns = Math.max(rowOffset ? 11 : 5, blocks.length ? blocks.length * 7 - 2 : 5);
  if (columns > 18278) throw new Error('Too many clients for one horizontal Google Sheet. Split clients into multiple spreadsheets.');
  const gridRows = Math.max(rows, previousRows);
  const gridColumns = Math.max(columns, previousColumns);
  if (gridRows * gridColumns > 10000000) throw new Error('This client report exceeds the Google Sheets cell limit.');
  const range = (r1: number, r2: number, c1: number, c2: number): sheets_v4.Schema$GridRange => ({ sheetId, startRowIndex: r1 + rowOffset, endRowIndex: r2 + rowOffset, startColumnIndex: c1, endColumnIndex: c2 });
  const all = range(-rowOffset, gridRows - rowOffset, 0, gridColumns);
  const requests: sheets_v4.Schema$Request[] = [
    { updateSheetProperties: { properties: { sheetId, gridProperties: { rowCount: gridRows, columnCount: gridColumns, frozenRowCount: rowOffset ? 1 : 3, hideGridlines: true } }, fields: 'gridProperties' } },
    { unmergeCells: { range: all } },
    // Clear the generated tab inside the same atomic batch as its replacement.
    { updateCells: { range: all, fields: 'userEnteredValue,userEnteredFormat,note' } },
    { repeatCell: { range: all, cell: { userEnteredFormat: { backgroundColor: background, textFormat: { foregroundColor: text, fontFamily: 'Arial', fontSize: 11 }, verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: gridRows }, properties: { pixelSize: 36 }, fields: 'pixelSize' } },
  ];
  const style = (r1: number, r2: number, c1: number, c2: number, format: sheets_v4.Schema$CellFormat) => {
    requests.push({ repeatCell: { range: range(r1, r2, c1, c2), cell: { userEnteredFormat: format }, fields: Object.keys(format).map(key => `userEnteredFormat.${key}`).join(',') } });
  };
  const merge = (row: number, col: number, width: number) => requests.push({ mergeCells: { range: range(row, row + 1, col, col + width), mergeType: 'MERGE_ALL' } });
  const tableBorders = (r1: number, r2: number, c1: number, c2: number, grid = false) => {
    const line = { style: 'SOLID', color: border };
    requests.push({ updateBorders: { range: range(r1, r2, c1, c2), top: line, bottom: line, left: line, right: line,
      ...(grid ? { innerHorizontal: line, innerVertical: line } : {}) } });
  };
  if (!blocks.length) requests.push({ updateCells: { start: { sheetId, rowIndex: rowOffset, columnIndex: 0 }, rows: [{ values: [{ userEnteredValue: { stringValue: 'No clients yet' } }] }], fields: 'userEnteredValue' } });
  blocks.forEach((block, index) => {
    const col = index * 7;
    const projectRows = block.projects.length || 1;
    const totalRow = 3 + projectRows;
    const data: (string | number)[][] = [
      [block.name], [block.contact ? `PROJECT SUMMARY · ${block.contact}` : 'PROJECT SUMMARY'],
      ['Project Date', 'Project', 'Assigned Team', 'Net Value', 'Status'],
      ...(block.projects.length ? block.projects.map(p => [p.date, p.name, p.assignedTo, p.value, p.status]) : [['', 'No projects yet', '', '', '']]),
      ['Total Project Value', '', '', block.total, ''], [], ['CLIENT SUMMARY'],
      ['RECEIVED', '', '', 'PENDING', ''], [block.received, '', '', block.pending, ''],
      ...(block.credit > 0 ? [['Advance / Credit', '', '', block.credit, '']] : []),
    ];
    requests.push({ updateCells: { start: { sheetId, rowIndex: rowOffset, columnIndex: col }, rows: data.map(values => ({ values: values.map(value => ({ userEnteredValue: typeof value === 'number' ? { numberValue: value } : { stringValue: value } })) })), fields: 'userEnteredValue' } });
    merge(0, col, 5); merge(1, col, 5); merge(totalRow + 2, col, 5);
    style(0, 1, col, col + 5, { textFormat: { bold: true, fontSize: 23, foregroundColor: background }, backgroundColor: orange });
    style(1, 2, col, col + 5, { textFormat: { bold: true, fontSize: 12, foregroundColor: text } });
    style(2, 3, col, col + 5, { backgroundColor: peach, textFormat: { bold: true, foregroundColor: text } });
    block.projects.forEach((_, i) => {
      if (i % 2 === 1) style(3 + i, 4 + i, col, col + 5, { backgroundColor: stripe });
    });
    style(3, totalRow + 1, col + 3, col + 4, { numberFormat: currency, textFormat: { bold: true, foregroundColor: text } });
    for (const offset of [0, ...(block.credit > 0 ? [5] : [])]) {
      const row = totalRow + offset;
      merge(row, col, 3); merge(row, col + 3, 2);
      style(row, row + 1, col, col + 5, { backgroundColor: offset === 0 ? black : mint, textFormat: { bold: true, foregroundColor: offset === 0 ? background : green, fontSize: 14 } });
      style(row, row + 1, col + 3, col + 5, { numberFormat: currency });
      if (offset === 0) style(row, row + 1, col + 3, col + 5, { textFormat: { bold: true, foregroundColor: orange, fontSize: 22 } });
      tableBorders(row, row + 1, col, col + 3);
      tableBorders(row, row + 1, col + 3, col + 5);
    }
    style(totalRow + 2, totalRow + 3, col, col + 5, { textFormat: { bold: true, fontSize: 15, foregroundColor: text } });
    // Two adjacent summary cards: labels above numeric, editable amounts.
    for (const [side, start] of [[0, col], [1, col + 3]] as const) {
      merge(totalRow + 3, start, 2);
      merge(totalRow + 4, start, 2);
      style(totalRow + 3, totalRow + 5, start, start + 2, { backgroundColor: side === 0 ? mint : peach, horizontalAlignment: 'CENTER' });
      style(totalRow + 3, totalRow + 4, start, start + 2, { textFormat: { bold: true, fontSize: 12, foregroundColor: text } });
      style(totalRow + 4, totalRow + 5, start, start + 2, { numberFormat: currency, textFormat: { bold: true, fontSize: 23, foregroundColor: side === 0 ? green : pendingText } });
      tableBorders(totalRow + 3, totalRow + 5, start, start + 2);
      requests.push({ updateBorders: { range: range(totalRow + 3, totalRow + 5, start, start + 2), left: { style: 'SOLID_THICK', color: side === 0 ? green : orange } } });
    }
    block.projects.forEach((project, i) => style(3 + i, 4 + i, col + 4, col + 5, { backgroundColor: project.status === 'Delivered' ? mint : peach, horizontalAlignment: 'CENTER', textFormat: { bold: true, foregroundColor: project.status === 'Delivered' ? green : pendingText } }));
    tableBorders(0, 1, col, col + 5);
    tableBorders(2, totalRow, col, col + 5, true);
    [130, 220, 180, 140, 130].forEach((width, offset) => requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: col + offset, endIndex: col + offset + 1 }, properties: { pixelSize: width }, fields: 'pixelSize' } }));
    if (index < blocks.length - 1) {
      requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: col + 5, endIndex: col + 7 }, properties: { pixelSize: 14 }, fields: 'pixelSize' } });
    }
  });
  // Rows are shared by all side-by-side clients; take the tallest requirement.
  const rowHeights = new Map<number, number>([[0, 64], [1, 38], [2, 44]]);
  for (const block of blocks) {
    const total = 3 + Math.max(1, block.projects.length);
    for (const [row, height] of [[total, 56], [total + 2, 40], [total + 3, 36], [total + 4, 58]]) {
      rowHeights.set(row, Math.max(rowHeights.get(row) || 36, height));
    }
  }
  for (const [row, height] of rowHeights) requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: row + rowOffset, endIndex: row + rowOffset + 1 }, properties: { pixelSize: height }, fields: 'pixelSize' } });
  return requests;
}
