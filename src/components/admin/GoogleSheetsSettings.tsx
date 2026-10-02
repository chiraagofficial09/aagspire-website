import React, { useEffect, useState } from 'react';
import { Copy, ExternalLink, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { api, clearApiCache } from '../../services/api';
import { useToast } from '../work/Toast';

type Connection = { spreadsheetId: string; title: string };
type SyncResult = { spreadsheetId: string; sheetId: number; clientCount: number; syncedCount: number; syncedAt: string };
const message = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export const GoogleSheetsSettings: React.FC = () => {
  const toast = useToast();
  const [configured, setConfigured] = useState(false);
  const [email, setEmail] = useState('');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState<'status' | 'test' | 'sync' | null>('status');
  const [error, setError] = useState('');
  const [connection, setConnection] = useState<Connection | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/admin/google-sheets/status', { headers: { 'Cache-Control': 'no-cache' } }).then(res => {
      if (cancelled) return;
      setConfigured(Boolean(res.data.configured));
      setEmail(res.data.serviceAccountEmail || '');
      setTarget(res.data.defaultSheetId || '');
      setConnection(res.data.savedSheet || null);
    }).catch(err => {
      if (!cancelled) setError(message(err, 'Could not load configuration. Reload this page to retry.'));
    }).finally(() => { if (!cancelled) setBusy(null); });
    return () => { cancelled = true; };
  }, []);

  const testConnection = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy('test'); setError(''); setConnection(null); setResult(null);
    try {
      const res = await api.post('/admin/google-sheets/test', { spreadsheetId: target.trim(), save: true });
      setConnection(res.data);
      setTarget(res.data.spreadsheetId);
      clearApiCache('/admin/google-sheets');
      toast.success(`Saved connection to ${res.data.title}`);
    } catch (err) { setError(message(err, 'Connection failed. Check the spreadsheet link and sharing permissions.')); }
    finally { setBusy(null); }
  };

  const sync = async () => {
    if (!connection) return;
    setBusy('sync'); setError('');
    try {
      const res = await api.post('/admin/google-sheets/sync', { type: 'client-projects', spreadsheetId: connection.spreadsheetId });
      setResult(res.data);
      toast.success(`Synced ${res.data.clientCount} clients and ${res.data.syncedCount} projects`);
    } catch (err) { setError(message(err, 'Sync failed. Please retry.')); }
    finally { setBusy(null); }
  };

  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(email); toast.success('Service account email copied'); }
    catch { toast.error('Could not copy. Select and copy the email below.'); }
  };

  return (
    <section className="rounded-2xl border border-orange-500/20 bg-[#08090d] p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-6 w-6 text-orange-400" />
          <div><h2 className="font-bold text-white">Client Project Report</h2>
            <p className="text-xs text-zinc-400 mt-1">Business dashboard, charts and side-by-side client reports in Google Sheets.</p></div>
        </div>
        <span className={`text-xs ${configured ? 'text-emerald-400' : 'text-amber-400'}`}>
          {busy === 'status' ? 'Checking configuration…' : configured ? 'Credentials configured' : 'Setup required'}
        </span>
      </div>
      {!configured && busy !== 'status' && <p className="text-sm text-amber-200 bg-amber-500/5 rounded-xl p-4">
        Enable Google Sheets API and securely install the service account key as server/google-credentials.json.
        Then reload this page. Never upload the key to GitHub.
      </p>}
      {email && <div className="rounded-xl bg-white/[0.03] p-3 text-xs text-zinc-400">
        Share your spreadsheet with this email as an <strong className="text-white">Editor</strong>:
        <div className="mt-2 flex items-center gap-3">
          <span className="text-emerald-400 break-all select-all">{email}</span>
          <button type="button" onClick={copyEmail} aria-label="Copy service account email" className="p-2 text-zinc-300 hover:text-white"><Copy className="h-4 w-4" /></button>
        </div>
      </div>}
      <form onSubmit={testConnection} className="space-y-2">
        <label htmlFor="client-report-sheet" className="block text-xs font-medium text-zinc-300">Google Spreadsheet URL or ID</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input id="client-report-sheet" required value={target} disabled={busy !== null}
            onChange={event => { setTarget(event.target.value); setConnection(null); setResult(null); setError(''); }}
            placeholder="Paste your Google Sheet link"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0d0e14] p-3 text-sm text-white focus:outline-none focus:border-orange-400 disabled:opacity-50" />
          <button disabled={busy !== null || !configured || !target.trim()} className="rounded-xl border border-emerald-500/30 px-4 py-3 text-xs font-semibold text-emerald-400 disabled:opacity-40">
            {busy === 'test' ? 'Saving…' : 'Test & Save Connection'}
          </button>
        </div>
        <p className="text-xs text-zinc-500">Saved for all admins. Reports and payment/expense exports use this Sheet. No Sheet ID environment variable is needed.</p>
      </form>
      {connection && <p className="text-xs text-emerald-400">Connected: {connection.title}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={sync} disabled={!connection || busy !== null} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-bold text-black hover:bg-orange-400 disabled:opacity-40">
          <RefreshCw className={`h-4 w-4 ${busy === 'sync' ? 'animate-spin' : ''}`} />
          {busy === 'sync' ? 'Syncing report…' : 'Sync Clients & Projects'}
        </button>
        {result && <a target="_blank" rel="noreferrer" href={`https://docs.google.com/spreadsheets/d/${result.spreadsheetId}/edit#gid=${result.sheetId}`} className="inline-flex items-center gap-1 text-xs text-emerald-400">Open Report <ExternalLink className="h-3 w-3" /></a>}
      </div>
      <p className="text-xs text-zinc-500">Each sync refreshes the dashboard, charts and client tables in “Clients &amp; Projects”, plus its hidden chart-data tab. Keep manual notes in another tab. Use Sync again after changing clients, projects or payments.</p>
      {result && <p role="status" className="text-xs text-emerald-400">Last sync this session: {new Date(result.syncedAt).toLocaleString()} · {result.clientCount} clients · {result.syncedCount} projects</p>}
    </section>
  );
};
