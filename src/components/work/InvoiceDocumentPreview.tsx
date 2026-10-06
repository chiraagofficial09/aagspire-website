import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

export type InvoiceSnapshot = {
  previewId: string; html: string; fileName: string; requestKey: string;
  totals: { totalRevenue: number; pendingBalance: number };
};

// Previews requested ahead of time (while the user is still on the selection tab), so opening
// the Preview tab can show the invoice immediately. Entries are reused only well within the
// server's 1-hour snapshot expiry.
const PREFETCH_MAX_AGE_MS = 45 * 60 * 1000;
const prefetchedPreviews = new Map<string, { at: number; request: Promise<Omit<InvoiceSnapshot, 'requestKey'>> }>();

function requestPreview(clientId: string, requestKey: string) {
  const key = `${clientId}|${requestKey}`;
  const cached = prefetchedPreviews.get(key);
  if (cached && Date.now() - cached.at < PREFETCH_MAX_AGE_MS) return cached.request;
  const request = api.post(`/admin/clients/${clientId}/invoice-preview`, JSON.parse(requestKey)).then(res => res.data);
  // Keep only the latest request per client
  for (const k of prefetchedPreviews.keys()) if (k.startsWith(`${clientId}|`)) prefetchedPreviews.delete(k);
  prefetchedPreviews.set(key, { at: Date.now(), request });
  request.catch(() => prefetchedPreviews.delete(key));
  return request;
}

/** Renders nothing; prepares the preview in the background (debounced) while the user edits. */
export function InvoicePreviewPrefetcher({ clientId, requestKey }: { clientId: string; requestKey: string }) {
  useEffect(() => {
    const timer = setTimeout(() => { requestPreview(clientId, requestKey).catch(() => {}); }, 600);
    return () => clearTimeout(timer);
  }, [clientId, requestKey]);
  return null;
}

export function InvoiceDocumentPreview({ clientId, requestKey, onReady }: {
  clientId: string; requestKey: string; onReady: (snapshot: InvoiceSnapshot | null) => void;
}) {
  const [snapshot, setSnapshot] = useState<InvoiceSnapshot | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [height, setHeight] = useState(1200);
  const frame = useRef<HTMLIFrameElement>(null);
  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    let active = true;
    // Keep the previous preview on screen while the updated one loads (Download stays disabled
    // via onReady(null) until the new snapshot matches). First load is immediate; later edits
    // are debounced so the server isn't asked to rebuild the invoice on every keystroke.
    onReady(null); setError('');
    const alreadyRequested = prefetchedPreviews.has(`${clientId}|${requestKey}`);
    const timer = setTimeout(() => {
      hasLoadedOnce.current = true;
      requestPreview(clientId, requestKey).then(data => {
        if (!active) return;
        const value = { ...data, requestKey };
        setSnapshot(value); onReady(value);
      }).catch(err => {
        if (active) setError(err.response?.data?.message || 'Could not prepare invoice. Please retry.');
      });
    }, hasLoadedOnce.current && !alreadyRequested ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [clientId, requestKey, retry, onReady]);
  if (error) return <div role="alert" className="p-6 text-red-300">{error}<button className="ml-3 underline" onClick={() => setRetry(n => n + 1)}>Retry preview</button></div>;
  if (!snapshot) return <p role="status" className="p-6 text-zinc-400">Preparing invoice preview…</p>;
  return <div className="overflow-x-auto">
    <iframe ref={frame} title="Exact invoice document preview" sandbox="allow-same-origin" srcDoc={snapshot.html}
      style={{ display: 'block', width: '595.2801pt', height, border: 0, colorScheme: 'normal' }}
      onLoad={async () => {
        const doc = frame.current?.contentDocument;
        if (!doc) return;
        await doc.fonts.ready;
        await Promise.all(Array.from(doc.images).map(image => image.decode().catch(() => {})));
        setHeight(Math.ceil(doc.querySelector('main')?.getBoundingClientRect().height || 1200));
      }} />
  </div>;
}
