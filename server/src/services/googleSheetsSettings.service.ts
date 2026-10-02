import { GoogleSheetsSettings } from '../models/GoogleSheetsSettings.js';

export function parseSpreadsheetId(input?: string): string {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Enter a Google Spreadsheet URL or ID in Settings.');
  const value = input.trim();
  const match = value.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:[/?#]|$)/);
  const id = match ? match[1] : value;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Enter a valid Google Spreadsheet URL or ID.');
  return id;
}

export async function getSavedGoogleSheet() {
  return GoogleSheetsSettings.findById('default').lean();
}

export async function saveGoogleSheet(spreadsheetId: string, title: string) {
  return GoogleSheetsSettings.findOneAndUpdate({ _id: 'default' },
    { $set: { spreadsheetId: parseSpreadsheetId(spreadsheetId), title } },
    { upsert: true, new: true, runValidators: true }).lean();
}

export async function resolveSpreadsheetId(input?: string): Promise<string> {
  if (input !== undefined) return parseSpreadsheetId(input);
  const saved = await getSavedGoogleSheet();
  if (!saved) throw new Error('Save a Google Sheet in Admin Settings before syncing.');
  return saved.spreadsheetId;
}
