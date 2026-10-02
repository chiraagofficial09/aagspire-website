import fs from 'fs';
import { fileURLToPath } from 'url';
import { google, sheets_v4 } from 'googleapis';
import { ENV } from '../config/env.js';
import { OfficeExpense } from '../models/OfficeExpense.js';
import { ClientPayment } from '../models/ClientPayment.js';
import { WorkLog } from '../models/WorkLog.js';
import { Client } from '../models/Client.js';
import { Project } from '../models/Project.js';
import { buildClientBlocks, buildClientSheetRequests } from './clientProjectSheet.js';
import { buildDashboardData, buildDashboardRequests, CLIENT_REPORT_START_ROW, DASHBOARD_DATA_TITLE } from './clientSheetDashboard.js';
import { fromDecimal } from '../utils/decimalHelper.js';
import { resolveSpreadsheetId } from './googleSheetsSettings.service.js';

let cachedAuth: any = null;
const activeClientSyncs = new Set<string>();

export async function syncClientProjectsToSheet(rawSpreadsheetId?: string) {
  const spreadsheetId = await resolveSpreadsheetId(rawSpreadsheetId);
  if (activeClientSyncs.has(spreadsheetId)) throw new Error('A client report sync is already running. Please wait.');
  activeClientSyncs.add(spreadsheetId);
  try {
    const sheets = getSheetsClient();
    const [clients, projects, payments, metadata] = await Promise.all([
      Client.find().select('name companyName').lean(),
      Project.find().select('clientId projectName projectValue discountPercent discountAmount startDate createdAt deadline status').lean(),
      ClientPayment.find().select('clientId amount paymentDate createdAt').lean(),
      sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets(properties,charts(chartId))' }),
    ]);
    const blocks = buildClientBlocks(clients, projects, payments);
    const tabTitle = 'Clients & Projects';
    const reportTab = metadata.data.sheets?.find(tab => tab.properties?.title === tabTitle);
    const existing = reportTab?.properties;
    const dataTab = metadata.data.sheets?.find(tab => tab.properties?.title === DASHBOARD_DATA_TITLE)?.properties;
    const usedIds = new Set(metadata.data.sheets?.map(tab => tab.properties?.sheetId));
    let sheetId = existing?.sheetId ?? 0;
    if (!existing) while (usedIds.has(sheetId)) sheetId++;
    usedIds.add(sheetId);
    let dataSheetId = dataTab?.sheetId ?? 0;
    if (!dataTab) while (usedIds.has(dataSheetId)) dataSheetId++;
    const requests = buildClientSheetRequests(sheetId, blocks, existing?.gridProperties?.rowCount || 1, existing?.gridProperties?.columnCount || 1, CLIENT_REPORT_START_ROW);
    if (!existing) requests.unshift({ addSheet: { properties: { sheetId, title: tabTitle } } });
    if (!dataTab) requests.unshift({ addSheet: { properties: { sheetId: dataSheetId, title: DASHBOARD_DATA_TITLE } } });
    const dashboard = buildDashboardData(blocks, clients, projects, payments);
    requests.push(...buildDashboardRequests(sheetId, dataSheetId, dashboard, (reportTab?.charts || []).flatMap(chart => chart.chartId == null ? [] : [chart.chartId])));
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
    return { success: true, spreadsheetId, tabTitle, sheetId, syncedCount: projects.length, clientCount: blocks.length, syncedAt: new Date().toISOString() };
  } finally {
    activeClientSyncs.delete(spreadsheetId);
  }
}

/**
 * Resolve Google Auth client from credentials JSON file or Environment Variables.
 */
export function getGoogleSheetsAuth() {
  if (cachedAuth) return cachedAuth;

  // 1. Check custom path from ENV
  if (ENV.GOOGLE_CREDENTIALS_PATH && fs.existsSync(ENV.GOOGLE_CREDENTIALS_PATH)) {
    cachedAuth = new google.auth.GoogleAuth({
      keyFile: ENV.GOOGLE_CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return cachedAuth;
  }

  // 2. Check server/google-credentials.json
  const defaultLocalJson = fileURLToPath(new URL('../../google-credentials.json', import.meta.url));
  if (fs.existsSync(defaultLocalJson)) {
    cachedAuth = new google.auth.GoogleAuth({
      keyFile: defaultLocalJson,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return cachedAuth;
  }

  // 3. Check ENV variables (Service Account Email & Private Key)
  if (ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL && ENV.GOOGLE_PRIVATE_KEY) {
    let privateKey = ENV.GOOGLE_PRIVATE_KEY;
    // Replace escaped newlines if present
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    // Remove surrounding quotes if user copied them
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }

    cachedAuth = new google.auth.GoogleAuth({
      credentials: {
        client_email: ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return cachedAuth;
  }

  return null;
}

/**
 * Returns true if Google Sheets credentials are configured
 */
export function isGoogleSheetsConfigured(): boolean {
  try {
    return getGoogleSheetsAuth() !== null;
  } catch {
    return false;
  }
}

/**
 * Get Sheets API instance
 */
function getSheetsClient(): sheets_v4.Sheets {
  const auth = getGoogleSheetsAuth();
  if (!auth) {
    throw new Error(
      'Google Sheets is not configured. Please add google-credentials.json or set GOOGLE_SERVICE_ACCOUNT_EMAIL & GOOGLE_PRIVATE_KEY in .env'
    );
  }
  return google.sheets({ version: 'v4', auth });
}

/**
 * Clean and extract spreadsheet ID from either a raw ID or full Google Sheet URL.
 */
export { parseSpreadsheetId } from './googleSheetsSettings.service.js';

/**
 * Test connection to a Google Spreadsheet
 */
export async function testGoogleSheetsConnection(rawSpreadsheetId?: string) {
  const spreadsheetId = await resolveSpreadsheetId(rawSpreadsheetId);
  const sheets = getSheetsClient();

  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const title = metadata.data.properties?.title || 'Untitled Spreadsheet';
  const sheetTabs = metadata.data.sheets?.map((s) => s.properties?.title || '') || [];

  return {
    success: true,
    spreadsheetId,
    title,
    sheetTabs,
  };
}

/**
 * Ensure a sheet tab exists with the given title and header row
 */
async function ensureTabExists(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabTitle: string,
  headers: string[]
) {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = metadata.data.sheets || [];
  const exists = existingSheets.some((s) => s.properties?.title === tabTitle);

  if (!exists) {
    // Add new tab
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: tabTitle,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
            },
          },
        ],
      },
    });

    // Write headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${tabTitle}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    });
  }
}

/**
 * Sync all Office Expenses to Google Sheet
 */
export async function syncExpensesToSheet(rawSpreadsheetId?: string) {
  const spreadsheetId = await resolveSpreadsheetId(rawSpreadsheetId);
  const sheets = getSheetsClient();
  const tabTitle = 'Office Expenses';
  const headers = ['Date', 'Title / Description', 'Amount (INR)', 'Payment Method', 'Notes', 'Expense ID'];

  await ensureTabExists(sheets, spreadsheetId, tabTitle, headers);

  // Fetch all expenses from MongoDB
  const expenses = await OfficeExpense.find().sort({ expenseDate: -1, createdAt: -1 }).lean();

  const rows = expenses.map((exp: any) => [
    new Date(exp.expenseDate).toLocaleDateString('en-IN'),
    exp.title || '',
    fromDecimal(exp.amount),
    (exp.paymentMethod || 'cash').toUpperCase(),
    exp.notes || '',
    String(exp._id),
  ]);

  // Overwrite existing data starting from row 1 (keep clean sync)
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${tabTitle}'!A:Z`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${tabTitle}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers, ...rows],
    },
  });

  return {
    success: true,
    tabTitle,
    syncedCount: rows.length,
    spreadsheetId,
  };
}

/**
 * Sync all Client Payments to Google Sheet
 */
export async function syncPaymentsToSheet(rawSpreadsheetId?: string) {
  const spreadsheetId = await resolveSpreadsheetId(rawSpreadsheetId);
  const sheets = getSheetsClient();
  const tabTitle = 'Client Payments';
  const headers = [
    'Payment Date',
    'Project Code',
    'Project Name',
    'Client Name',
    'Amount (INR)',
    'Payment Method',
    'Transaction Ref',
    'Notes',
    'Payment ID',
  ];

  await ensureTabExists(sheets, spreadsheetId, tabTitle, headers);

  const payments = await ClientPayment.find()
    .populate('projectId', 'projectName projectCode')
    .populate('clientId', 'name companyName')
    .sort({ paymentDate: -1, createdAt: -1 });

  const rows = payments.map((p: any) => {
    const proj = p.projectId as any;
    const cli = p.clientId as any;
    return [
      new Date(p.paymentDate).toLocaleDateString('en-IN'),
      proj?.projectCode || '',
      proj?.projectName || '',
      cli?.companyName || cli?.name || '',
      fromDecimal(p.amount),
      (p.paymentMethod || '').toUpperCase(),
      p.transactionReference || '',
      p.notes || '',
      String(p._id),
    ];
  });

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${tabTitle}'!A:Z`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${tabTitle}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers, ...rows],
    },
  });

  return {
    success: true,
    tabTitle,
    syncedCount: rows.length,
    spreadsheetId,
  };
}

/**
 * Sync all Work Logs to Google Sheet
 */
export async function syncWorkLogsToSheet(rawSpreadsheetId?: string) {
  const spreadsheetId = await resolveSpreadsheetId(rawSpreadsheetId);
  const sheets = getSheetsClient();
  const tabTitle = 'Employee Work Logs';
  const headers = [
    'Work Date',
    'Employee Code',
    'Employee Name',
    'Task Name',
    'Projects Worked',
    'Total Minutes',
    'Status',
    'Admin Comment',
    'Work Log ID',
  ];

  await ensureTabExists(sheets, spreadsheetId, tabTitle, headers);

  const logs = await WorkLog.find()
    .populate('employeeId', 'fullName employeeCode')
    .sort({ workDate: -1, createdAt: -1 })
    .lean();

  const rows = logs.map((log: any) => {
    const emp = log.employeeId as any;
    const projectNames = (log.projectsWorked || []).map((p: any) => p.projectName || p.projectCode).filter(Boolean).join(', ');

    return [
      new Date(log.workDate).toLocaleDateString('en-IN'),
      emp?.employeeCode || '',
      emp?.fullName || '',
      log.taskName || '',
      projectNames || 'N/A',
      log.totalMinutes || 0,
      (log.status || 'submitted').toUpperCase(),
      log.adminComment || '',
      String(log._id),
    ];
  });

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${tabTitle}'!A:Z`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${tabTitle}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers, ...rows],
    },
  });

  return {
    success: true,
    tabTitle,
    syncedCount: rows.length,
    spreadsheetId,
  };
}

/**
 * Sync all sections (Expenses, Payments, Work Logs) in one operation
 */
export async function syncAllToSheet(rawSpreadsheetId?: string) {
  const spreadsheetId = await resolveSpreadsheetId(rawSpreadsheetId);
  const expensesResult = await syncExpensesToSheet(spreadsheetId);
  const paymentsResult = await syncPaymentsToSheet(spreadsheetId);
  const workLogsResult = await syncWorkLogsToSheet(spreadsheetId);

  return {
    success: true,
    spreadsheetId: expensesResult.spreadsheetId,
    results: {
      expenses: expensesResult.syncedCount,
      payments: paymentsResult.syncedCount,
      workLogs: workLogsResult.syncedCount,
    },
  };
}

/**
 * Append a single row seamlessly to Google Sheet in real-time (fail-safe)
 */
export async function appendRowSafely(tabTitle: string, rowValues: any[], rawSpreadsheetId?: string) {
  try {
    if (!isGoogleSheetsConfigured()) return;
    const spreadsheetId = await resolveSpreadsheetId(rawSpreadsheetId);
    const sheets = getSheetsClient();

    const headers: Record<string, string[]> = {
      'Office Expenses': ['Date', 'Title / Description', 'Amount (INR)', 'Payment Method', 'Notes', 'Expense ID'],
      'Client Payments': ['Payment Date', 'Project Code', 'Project Name', 'Client Name', 'Amount (INR)', 'Payment Method', 'Transaction Ref', 'Notes', 'Payment ID'],
    };
    if (headers[tabTitle]) await ensureTabExists(sheets, spreadsheetId, tabTitle, headers[tabTitle]);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${tabTitle}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });
  } catch (err: any) {
    // Non-blocking log so app continues even if sheet API is temporarily unreachable
    console.warn(`[GoogleSheets] Real-time append error to ${tabTitle}:`, err.message);
  }
}
