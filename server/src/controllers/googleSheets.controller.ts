import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ENV } from '../config/env.js';
import {
  isGoogleSheetsConfigured,
  testGoogleSheetsConnection,
  syncExpensesToSheet,
  syncPaymentsToSheet,
  syncWorkLogsToSheet,
  syncAllToSheet,
} from '../services/googleSheets.service.js';

export async function getGoogleSheetsStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const isConfigured = isGoogleSheetsConfigured();
    res.json({
      success: true,
      configured: isConfigured,
      serviceAccountEmail: ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL || null,
      defaultSheetId: ENV.GOOGLE_SHEET_ID || null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function testConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { spreadsheetId } = req.body;
    const result = await testGoogleSheetsConnection(spreadsheetId);
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
    const { type = 'all', spreadsheetId } = req.body;

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
      default:
        result = await syncAllToSheet(spreadsheetId);
        break;
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
