'use client';
import { useEffect, useState } from 'react';
import { Ship } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { YachtListing } from '@/lib/yacht-catalog';
import { announcePhoto, repairPhoto } from './use-catalog-photo-updates';

export function YachtImage({ yacht, className }: { yacht: YachtListing; className?: string }) {
  const stable = yacht.imageUrl?.startsWith('/api/yacht-image?id=') ? yacht.imageUrl : null;
  const [resolved, setResolved] = useState<{ id: string; url: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const src = stable ?? (resolved?.id === yacht.id ? resolved.url : null);
  useEffect(() => {
    if (stable || !yacht.url) return;
    let active = true;
    repairPhoto(yacht.url, yacht.imageUrl).then(imageUrl => {
      if (active) { setResolved({ id: yacht.id, url: imageUrl }); announcePhoto(yacht.id, imageUrl, yacht.imageUrl); }
    }).catch(() => { if (active) setMessage('Photo unavailable'); });
    return () => { active = false; };
  }, [stable, yacht.id, yacht.url, yacht.imageUrl]);
  const retry = async () => {
    setBusy(true); setMessage('');
    try {
      const imageUrl = await repairPhoto(yacht.url, yacht.imageUrl);
      setResolved({ id: yacht.id, url: imageUrl }); setFailed(null); announcePhoto(yacht.id, imageUrl);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Please retry.'); }
    finally { setBusy(false); }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setMessage('Choose a photo under 8 MB.'); return; }
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/yacht-image', { method: 'POST', body: file });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResolved({ id: yacht.id, url: data.imageUrl }); setFailed(null); announcePhoto(yacht.id, data.imageUrl);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload failed.'); }
    finally { setBusy(false); }
  };
  const visible = src && src !== failed;
  return <div className={cn('absolute inset-0 bg-bg-secondary', className)}>
    {!visible && <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-text-secondary">
      <Ship className="h-6 w-6 shrink-0 text-gold/60" />
      <span className="text-xs" role="status">{busy ? 'Saving photo…' : message || 'Finding photo…'}</span>
      <div className="flex gap-3 text-xs text-gold">
        <button type="button" disabled={busy} onClick={retry} className="min-h-9 disabled:opacity-50">Retry photo</button>
        <label className={cn('flex min-h-9 cursor-pointer items-center', busy && 'pointer-events-none opacity-50')}>
          Upload photo<input aria-label={`Upload photo for ${yacht.name}`} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={busy}
            onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
        </label>
      </div>
    </div>}
    {visible && (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img key={src} src={src} alt={yacht.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover"
        onError={() => { setFailed(src); setMessage('Photo unavailable'); }} />
    )}
  </div>;
}
