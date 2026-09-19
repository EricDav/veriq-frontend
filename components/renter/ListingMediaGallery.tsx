'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import type { ListingMediaView } from '@/types/renter';
import { humanise, mediaSrc } from './format';

function itemLabel(item: ListingMediaView) {
  return item.caption || humanise(item.componentKey || item.mediaCategory || 'photo');
}

/** Unlock-only verified media grouped by media category, with a keyboard-free lightbox. */
export function ListingMediaGallery({ media, title = 'Verified photos' }: { media: ListingMediaView[]; title?: string }) {
  const [section, setSection] = useState('all');
  const [index, setIndex] = useState<number | null>(null);

  const sections = useMemo(
    () => ['all', ...Array.from(new Set(media.map((item) => item.mediaCategory ?? 'other')))],
    [media],
  );
  const filtered = section === 'all' ? media : media.filter((item) => (item.mediaCategory ?? 'other') === section);
  const active = index !== null ? filtered[index] : null;

  return (
    <div className="card p-6">
      <h3 className="font-display mb-4 flex items-center gap-2 text-base font-bold text-navy-900">
        <Eye className="h-4 w-4 text-veriq-secondary" /> {title}
      </h3>
      {media.length === 0 ? (
        <p className="text-sm text-veriq-muted">No approved photos are available for this listing yet.</p>
      ) : (
        <>
          {sections.length > 2 && (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {sections.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setSection(key); setIndex(null); }}
                  className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${section === key ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {key === 'all' ? 'All' : humanise(key)}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(idx)}
                className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 text-left transition-opacity hover:opacity-90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaSrc(item.variants?.card ?? item.url)} alt={itemLabel(item)} className="h-full w-full object-cover" loading="lazy" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-navy-950/70 px-2 py-1 text-[10px] text-white">{itemLabel(item)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {active && index !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setIndex(null)}>
          <button type="button" onClick={() => setIndex(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" aria-label="Close photo">
            <X className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); setIndex(Math.max(0, index - 1)); }}
            disabled={index === 0}
            className="absolute left-2 rounded-full bg-white/10 p-2 text-white disabled:opacity-20 sm:left-6"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <div className="mx-12 w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaSrc(active.variants?.full ?? active.url)} alt={itemLabel(active)} className="max-h-[80vh] w-full rounded-xl object-contain" />
            <p className="mt-3 text-center text-sm text-white/70">{itemLabel(active)}</p>
            <p className="mt-1 text-center text-xs text-white/40">{index + 1} / {filtered.length}</p>
          </div>
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); setIndex(Math.min(filtered.length - 1, index + 1)); }}
            disabled={index === filtered.length - 1}
            className="absolute right-2 rounded-full bg-white/10 p-2 text-white disabled:opacity-20 sm:right-6"
            aria-label="Next photo"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </div>
      )}
    </div>
  );
}
