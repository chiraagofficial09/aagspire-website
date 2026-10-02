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

/** Four columns per client, with three blank spacer columns. */
export function buildClientSheetRequests(sheetId: number, blocks: ClientBlock[], previousRows = 1, previousColumns = 1, rowOffset = 0) {
  const orangeDark = { red: 0.98, green: 0.32, blue: 0.05 }; // #FA520D Deep vibrant orange
  const gradientCols = [
    { red: 1, green: 0.36, blue: 0.10 }, // Col 0: #FF5C1A
    { red: 1, green: 0.44, blue: 0.18 }, // Col 1: #FF702E
    { red: 1, green: 0.52, blue: 0.26 }, // Col 2: #FF8542
    { red: 1, green: 0.60, blue: 0.35 }, // Col 3: #FF9959
  ];
  const darkNavy = { red: 0.08, green: 0.12, blue: 0.20 };
  const orange = { red: 1, green: 0.38, blue: 0.10 };
  const slateText = { red: 0.09, green: 0.12, blue: 0.17 };
  const stripe = { red: 0.98, green: 0.99, blue: 1.0 };
  const background = { red: 1, green: 1, blue: 1 };
  const border = { red: 0.88, green: 0.90, blue: 0.93 };
  const currency = { type: 'NUMBER', pattern: '"₹"#,##0.00' };
  const rows = rowOffset + Math.max(8, ...blocks.map(b => (b.projects.length || 1) + 4));
  const columns = Math.max(rowOffset ? 11 : 4, blocks.length ? blocks.length * 7 - 3 : 4);
  if (columns > 18278) throw new Error('Too many clients for one horizontal Google Sheet. Split clients into multiple spreadsheets.');
  const gridRows = Math.max(rows, previousRows);
  const gridColumns = Math.max(columns, previousColumns);
  if (gridRows * gridColumns > 10000000) throw new Error('This client report exceeds the Google Sheets cell limit.');
  const range = (r1: number, r2: number, c1: number, c2: number): sheets_v4.Schema$GridRange => ({ sheetId, startRowIndex: r1 + rowOffset, endRowIndex: r2 + rowOffset, startColumnIndex: c1, endColumnIndex: c2 });
  const all = range(-rowOffset, gridRows - rowOffset, 0, gridColumns);
  const requests: sheets_v4.Schema$Request[] = [
    { updateSheetProperties: { properties: { sheetId, gridProperties: { rowCount: gridRows, columnCount: gridColumns, frozenRowCount: rowOffset ? 1 : 2, hideGridlines: true } }, fields: 'gridProperties' } },
    { unmergeCells: { range: all } },
    // Clear the generated tab inside the same atomic batch as its replacement.
    { updateCells: { range: all, fields: 'userEnteredValue,userEnteredFormat,note' } },
    { repeatCell: { range: all, cell: { userEnteredFormat: { backgroundColor: background, textFormat: { foregroundColor: slateText, fontFamily: 'Arial', fontSize: 11 }, verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat' } },
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
    const totalRow = 2 + projectRows;
    const data: (string | number)[][] = [
      [block.name],
      ['Project Date', 'Project', 'Assigned Team', 'Net Value'],
      ...(block.projects.length ? block.projects.map(p => [p.date, p.name, p.assignedTo, p.value]) : [['', 'No projects yet', '', '']]),
      ['Total Project Value', '', block.total, ''],
    ];
    requests.push({ updateCells: { start: { sheetId, rowIndex: rowOffset, columnIndex: col }, rows: data.map(values => ({ values: values.map(value => ({ userEnteredValue: typeof value === 'number' ? { numberValue: value } : { stringValue: value } })) })), fields: 'userEnteredValue' } });
    merge(0, col, 4);
    style(0, 1, col, col + 4, { textFormat: { bold: true, fontSize: 16, foregroundColor: background }, backgroundColor: orangeDark, horizontalAlignment: 'CENTER' });
    gradientCols.forEach((color, i) => {
      style(1, 2, col + i, col + i + 1, { backgroundColor: color, textFormat: { bold: true, foregroundColor: background, fontSize: 11 }, horizontalAlignment: i === 1 ? 'LEFT' : 'CENTER' });
    });
    block.projects.forEach((_, i) => {
      if (i % 2 === 1) style(2 + i, 3 + i, col, col + 4, { backgroundColor: stripe });
    });
    style(2, totalRow, col + 3, col + 4, { numberFormat: currency, textFormat: { bold: true, foregroundColor: slateText } });
    merge(totalRow, col, 2); merge(totalRow, col + 2, 2);
    style(totalRow, totalRow + 1, col, col + 4, { backgroundColor: darkNavy, textFormat: { bold: true, foregroundColor: background, fontSize: 13 } });
    style(totalRow, totalRow + 1, col + 2, col + 4, { numberFormat: currency, textFormat: { bold: true, foregroundColor: orange, fontSize: 20 } });
    tableBorders(totalRow, totalRow + 1, col, col + 2);
    tableBorders(totalRow, totalRow + 1, col + 2, col + 4);
    tableBorders(0, 1, col, col + 4);
    tableBorders(1, totalRow, col, col + 4, true);
    [140, 260, 220, 160].forEach((width, offset) => requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: col + offset, endIndex: col + offset + 1 }, properties: { pixelSize: width }, fields: 'pixelSize' } }));
    if (index < blocks.length - 1) {
      requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: col + 4, endIndex: col + 7 }, properties: { pixelSize: 26 }, fields: 'pixelSize' } });
    }
  });
  // Rows are shared by all side-by-side clients; take the tallest requirement.
  const rowHeights = new Map<number, number>([[0, 48], [1, 38]]);
  for (const block of blocks) {
    const total = 2 + Math.max(1, block.projects.length);
    rowHeights.set(total, Math.max(rowHeights.get(total) || 36, 48));
  }
  for (const [row, height] of rowHeights) requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: row + rowOffset, endIndex: row + rowOffset + 1 }, properties: { pixelSize: height }, fields: 'pixelSize' } });
  return requests;
}

