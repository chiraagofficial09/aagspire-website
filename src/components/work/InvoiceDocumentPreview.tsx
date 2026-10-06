import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

export type InvoiceSnapshot = {
  previewId: string; html: string; fileName: string; requestKey: string;
  totals: { totalRevenue: number; pendingBalance: number };
};

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
    onReady(null); setSnapshot(null); setError('');
    // First preview loads immediately; later edits (typing invoice no./discounts) are debounced
    // so the server isn't asked to rebuild the invoice on every keystroke.
    const timer = setTimeout(() => {
      hasLoadedOnce.current = true;
      api.post(`/admin/clients/${clientId}/invoice-preview`, JSON.parse(requestKey)).then(res => {
        if (!active) return;
        const value = { ...res.data, requestKey };
        setSnapshot(value); onReady(value);
      }).catch(err => {
        if (active) setError(err.response?.data?.message || 'Could not prepare invoice. Please retry.');
      });
    }, hasLoadedOnce.current ? 450 : 0);
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
