'use client';
import { useState } from 'react';
import { listingFromScrapeResult, type YachtListing } from '@/lib/yacht-catalog';

/** Captures the tab selected by the visitor, then immediately stops sharing. */
async function captureTab(): Promise<File> {
  if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Use Upload on this device.');
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: false });
  try {
    const video = document.createElement('video');
    video.srcObject = stream; video.muted = true;
    await video.play();
    await new Promise<void>(resolve => video.requestVideoFrameCallback(() => resolve()));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Capture failed.')), 'image/jpeg', 0.92));
    return new File([blob], 'listing-capture.jpg', { type: 'image/jpeg' });
  } finally { stream.getTracks().forEach(track => track.stop()); }
}
async function upload(file: File) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose images under 5 MB.');
  const response = await fetch('/api/yacht-image', { method: 'POST', body: file });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Image upload failed.');
  return new URL(data.imageUrl, location.origin).searchParams.get('id')!;
}
export function ScreenshotImport({ onImport, suggestedUrl = '' }: { onImport: (yacht: YachtListing, side: 'a' | 'b') => void; suggestedUrl?: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [specs, setSpecs] = useState<File[]>([]);
  const [side, setSide] = useState<'a' | 'b'>('a');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('');
  const capture = async (kind: 'photo' | 'spec') => {
    setError('');
    try { const file = await captureTab(); if (kind === 'photo') setPhoto(file); else setSpecs(previous => [...previous, file].slice(0, 4)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Capture cancelled.'); }
  };
  const run = async () => {
    if (!photo || !specs.length) return;
    setBusy(true); setError(''); setStep('Saving images…');
    try {
      const [photoId, ...specIds] = await Promise.all([photo, ...specs].map(upload));
      setStep('Reading visible specifications…');
      const response = await fetch('/api/import-yacht-screenshots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, photoId, specIds }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Import failed.');
      onImport(listingFromScrapeResult(data, url), side);
      setOpen(false); setPhoto(null); setSpecs([]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Import failed.'); }
    finally { setBusy(false); setStep(''); }
  };
  return <div className="mb-6 rounded-xl border border-border bg-bg-card p-4">
    <button type="button" className="text-sm font-medium text-gold" onClick={() => { if (!open && !url) setUrl(suggestedUrl); setOpen(!open); }} aria-expanded={open}>Import from listing screenshots</button>
    {!open && <p className="mt-1 text-xs text-text-secondary">If a site blocks the link, capture its boat photo and specs from a tab you can open.</p>}
    {open && <div className="mt-4 space-y-4">
      <p className="text-sm text-text-secondary">Open the listing in another tab. Capture its boat photo, then capture the title, price and specification sections. You can also upload screenshots.</p>
      <label className="block text-sm">Original listing URL<input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.yachtworld.com/yacht/..." className="mt-1 w-full rounded border border-border bg-bg-secondary p-3" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-border p-3"><p className="text-sm font-medium">1. Boat photo</p><p className="mb-2 text-xs text-text-secondary">Open the gallery photo before capturing, or upload the photo itself.</p>
          <button type="button" disabled={busy} onClick={() => capture('photo')} className="mb-2 min-h-10 text-sm text-gold">Capture photo tab</button>
          <input type="file" aria-label="Boat photo screenshot" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => setPhoto(e.target.files?.[0] ?? null)} className="block w-full text-xs" />
          {photo && <p className="mt-2 text-xs text-success">Photo ready: {photo.name}</p>}
        </div>
        <div className="rounded border border-border p-3"><p className="text-sm font-medium">2. Specification screenshots</p><p className="mb-2 text-xs text-text-secondary">Include the title and price. Expand the specs and engine sections. Up to 4 images.</p>
          <button type="button" disabled={busy || specs.length >= 4} onClick={() => capture('spec')} className="mb-2 min-h-10 text-sm text-gold">Capture specs tab</button>
          <input type="file" aria-label="Specification screenshots" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={e => setSpecs(Array.from(e.target.files ?? []).slice(0, 4))} className="block w-full text-xs" />
          {specs.length > 0 && <p className="mt-2 text-xs text-success">{specs.length} screenshot(s) ready <button type="button" disabled={busy} onClick={() => setSpecs([])} className="ml-2 text-gold">Clear</button></p>}
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm">Compare as<select value={side} disabled={busy} onChange={e => setSide(e.target.value as 'a' | 'b')} className="rounded border border-border bg-bg-secondary p-2"><option value="a">Yacht 1</option><option value="b">Yacht 2</option></select></label>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      <button type="button" disabled={busy || !photo || !specs.length || !url.trim()} onClick={run} className="rounded bg-gold px-5 py-3 text-sm font-semibold text-bg-primary disabled:opacity-40">{busy ? step : 'Read screenshots and add yacht'}</button>
      <p className="text-xs text-text-secondary">Only visible details are imported. Review them before sharing.</p>
    </div>}
  </div>;
}
