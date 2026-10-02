import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ENV } from '../config/env.js';
import { getSavedGoogleSheet, saveGoogleSheet, parseSpreadsheetId } from '../services/googleSheetsSettings.service.js';
import {
  isGoogleSheetsConfigured,
  testGoogleSheetsConnection,
  syncExpensesToSheet,
  syncPaymentsToSheet,
  syncWorkLogsToSheet,
  syncAllToSheet,
  syncClientProjectsToSheet,
  getGoogleSheetsAuth,
} from '../services/googleSheets.service.js';

export async function getGoogleSheetsStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const isConfigured = isGoogleSheetsConfigured();
    const credentials = isConfigured ? await getGoogleSheetsAuth().getCredentials() : null;
    const saved = await getSavedGoogleSheet();
    res.json({
      success: true,
      configured: isConfigured,
      serviceAccountEmail: credentials?.client_email || ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL || null,
      defaultSheetId: saved?.spreadsheetId || null,
      savedSheet: saved ? { spreadsheetId: saved.spreadsheetId, title: saved.title } : null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function testConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { spreadsheetId, save } = req.body;
    const result = await testGoogleSheetsConnection(parseSpreadsheetId(spreadsheetId));
    if (save === true) await saveGoogleSheet(result.spreadsheetId, result.title);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to connect to Google Sheets',
      details: error.response?.data?.error?.message || null,
    });
  }
}

export async function syncGoogleSheet(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { type = 'all', spreadsheetId: requestedId } = req.body;
    const saved = await getSavedGoogleSheet();
    if (!saved) {
      res.status(400).json({ success: false, message: 'Use Test & Save Connection in Settings before syncing.' });
      return;
    }
    if (requestedId !== undefined && parseSpreadsheetId(requestedId) !== saved.spreadsheetId) {
      res.status(409).json({ success: false, message: 'The saved Sheet has changed. Reload Settings and check the connection before syncing.' });
      return;
    }
    const spreadsheetId = saved.spreadsheetId;

    if (!isGoogleSheetsConfigured()) {
      res.status(400).json({
        success: false,
        message:
          'Google Sheets is not configured yet. Please provide a Google Service Account in your environment variables or place google-credentials.json in server/.',
      });
      return;
    }

    let result: any;
    switch (type) {
      case 'client-projects':
        result = await syncClientProjectsToSheet(spreadsheetId);
        break;
      case 'expenses':
        result = await syncExpensesToSheet(spreadsheetId);
        break;
      case 'payments':
        result = await syncPaymentsToSheet(spreadsheetId);
        break;
      case 'work-logs':
      case 'workLogs':
        result = await syncWorkLogsToSheet(spreadsheetId);
        break;
      case 'all':
        result = await syncAllToSheet(spreadsheetId);
        break;
      default:
        res.status(400).json({ success: false, message: 'Unsupported Google Sheets export type.' });
        return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Google Sheets sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync with Google Sheet',
      details: error.response?.data?.error?.message || null,
    });
  }
}
