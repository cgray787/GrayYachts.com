'use client';
import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { YachtListing } from '@/lib/yacht-catalog';
const EVENT = 'yacht-photo-saved';
export function announcePhoto(id: string, imageUrl: string, expected?: string | null) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { id, imageUrl, expected } }));
}
export function useCatalogPhotoUpdates(setCatalog: Dispatch<SetStateAction<YachtListing[]>>) {
  useEffect(() => {
    const update = (event: Event) => {
      const { id, imageUrl, expected } = (event as CustomEvent<{ id: string; imageUrl: string; expected?: string | null }>).detail;
      setCatalog(previous => previous.map(yacht => yacht.id === id && (expected === undefined || yacht.imageUrl === expected) ? { ...yacht, imageUrl } : yacht));
    };
    window.addEventListener(EVENT, update);
    return () => window.removeEventListener(EVENT, update);
  }, [setCatalog]);
}

const pending = new Map<string, Promise<string>>();
async function storedPhoto(source: string): Promise<string | null> {
  const response = await fetch(source + "&format=json", { cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json();
  return data.imageUrl ?? null;
}

export function repairPhoto(url: string, source?: string | null): Promise<string> {
  const query = new URLSearchParams({ url, format: 'json', v: '7' });
  if (source && /^https?:/.test(source)) query.set('source', source);
  const key = query.toString() + (source?.startsWith('/api/yacht-image?id=') ? '&saved=' + encodeURIComponent(source) : '');
  const existing = pending.get(key);
  if (existing) return existing;
  const result = (async () => {
    if (source?.startsWith('/api/yacht-image?id=')) {
      const saved = await storedPhoto(source);
      if (saved) return saved;
    }
    const response = await fetch('/api/yacht-image?' + query.toString(), { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !data.imageUrl) throw new Error(data.error ?? 'Photo unavailable.');
    return data.imageUrl as string;
  })().finally(() => pending.delete(key));
  pending.set(key, result);
  return result;
}
