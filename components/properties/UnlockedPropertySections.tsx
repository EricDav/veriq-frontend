'use client';

import { useState } from 'react';
import { ExternalLink, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import type { ContactAction, PropertyUnitDetail, PublicUnitSummary } from '@/types';

function label(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.map((item) => String(item).replace(/_/g, ' ')).join(', ') : null;
  if (typeof value === 'object') return null;
  return String(value).replace(/_/g, ' ');
}

function humanise(key: string) {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function formatNaira(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? `₦${amount.toLocaleString('en-NG')}` : null;
}

const PRICE_KEYS = ['rentAmount', 'annualRent', 'nightlyRate', 'dailyRate', 'weeklyRate', 'monthlyRate', 'contributionAmount', 'askingPrice'];

export function unitHeadlinePrice(price: Record<string, unknown>) {
  for (const key of PRICE_KEYS) {
    const formatted = formatNaira(price[key]);
    if (formatted) return { amount: formatted, basis: key === 'nightlyRate' || key === 'dailyRate' ? 'night' : key === 'weeklyRate' ? 'week' : key === 'monthlyRate' ? 'month' : 'yr' };
  }
  return null;
}

function AvailabilityBadge({ status, tone = 'light' }: { status: string; tone?: 'light' | 'dark' }) {
  const available = status === 'available';
  const cls = tone === 'dark'
    ? available ? 'bg-emerald-400/15 text-emerald-200' : 'bg-white/10 text-white/60'
    : available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold ${cls}`}><span className={`h-2 w-2 rounded-full ${available ? 'bg-emerald-400' : 'bg-slate-400'}`} />{available ? 'Available' : 'Unavailable'}</span>;
}

/** Pre-unlock unit list: type, basic price and availability only (§11.5). */
export function PublicUnitList({ units }: { units: PublicUnitSummary[] }) {
  if (!units.length) return null;
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      {units.map((unit) => {
        const price = unitHeadlinePrice(unit.price);
        return (
          <div key={unit.id} className="rounded-lg border border-emerald-400/60 bg-gradient-to-r from-[#063039] to-[#06312e] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">{unit.displayLabel}</h3>
                <span className="mt-2 inline-block rounded bg-cyan-400/10 px-2 py-1 text-xs text-cyan-300">{unit.unitType}</span>
              </div>
              <AvailabilityBadge status={unit.availabilityStatus} tone="dark" />
            </div>
            {price && <p className="mt-3 text-xl font-bold text-cyan-300">{price.amount} <span className="text-sm font-normal">/ {price.basis}</span></p>}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Unlocked: every documented Unit with its own facts, commercial terms and intelligence (§12.2, §30.1).
 * With more than one Unit a selector picks the Unit to read, so a renter can compare Units one at a time.
 */
export function DocumentedUnits({ units }: { units: PropertyUnitDetail[] }) {
  const [selectedId, setSelectedId] = useState<string>('all');
  if (!units.length) return null;

  const selected = selectedId === 'all' ? units : units.filter((unit) => unit.id === selectedId);
  const visible = selected.length ? selected : units;

  return (
    <div className="card p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-display text-base font-bold text-navy-900">Documented Units ({units.length})</h3>
        {units.length > 1 && (
          <div className="sm:w-64">
            <label htmlFor="unit-selector" className="sr-only">Select a Unit</label>
            <select id="unit-selector" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="input !py-2 !text-sm">
              <option value="all">All Units ({units.length})</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.displayLabel} — {unit.unitType.replace(/_/g, ' ')} ({unit.availabilityStatus === 'available' ? 'available' : 'unavailable'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="space-y-4">
        {visible.map((unit) => {
          const sections: Array<[string, Record<string, unknown>]> = [['Facts', unit.facts], ['Charges', unit.commercialTerms], ['Unit intelligence', unit.intelligence]];
          return (
            <div key={unit.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-navy-900">{unit.displayLabel}</p>
                  <p className="text-xs text-slate-500">{unit.unitType}</p>
                </div>
                <AvailabilityBadge status={unit.availabilityStatus} />
              </div>
              {sections.map(([title, values]) => {
                const rows = Object.entries(values ?? {}).map(([key, value]) => [humanise(key), key.toLowerCase().includes('fee') || key.toLowerCase().includes('rent') || key.toLowerCase().includes('charge') || key.toLowerCase().includes('rate') ? formatNaira(value) ?? label(value) : label(value)] as const).filter(([, value]) => value);
                if (!rows.length) return null;
                return (
                  <div key={title} className="mt-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
                    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {rows.map(([name, value]) => (
                        <div key={name} className="rounded-lg bg-slate-50 px-3 py-2">
                          <dt className="text-[11px] text-slate-500">{name}</dt>
                          <dd className="text-sm font-medium capitalize text-navy-900">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Contact capabilities after unlock: property contact (WhatsApp + call) and Veriq Agent support (§13). */
export function ContactActions({ contacts, agentSupport, bookingLink }: { contacts: ContactAction[]; agentSupport: ContactAction | null; bookingLink: string | null }) {
  if (!contacts.length && !agentSupport && !bookingLink) return null;
  return (
    <div className="card p-6">
      <h3 className="font-display mb-4 text-base font-bold text-navy-900">Contacts</h3>
      <div className="space-y-3">
        {contacts.map((contact) => (
          <div key={`${contact.contactType}-${contact.phone}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
            <div>
              <p className="font-semibold text-navy-900">{contact.name}</p>
              <p className="text-xs capitalize text-slate-500">Property {contact.contactType}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {contact.whatsappUrl && <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2 !py-2 !text-sm"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
              <a href={`tel:${contact.phone}`} className="btn-outline flex items-center gap-2 !py-2 !text-sm"><Phone className="h-4 w-4" /> {contact.phone}</a>
            </div>
          </div>
        ))}
        {agentSupport?.whatsappUrl && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div>
              <p className="flex items-center gap-2 font-semibold text-navy-900"><ShieldCheck className="h-4 w-4 text-emerald-600" /> {agentSupport.name}</p>
              <p className="text-xs text-slate-500">Assigned Veriq Agent — for questions about this property&apos;s intelligence or your unlock</p>
            </div>
            <a href={agentSupport.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-outline flex items-center gap-2 !py-2 !text-sm"><MessageCircle className="h-4 w-4" /> WhatsApp Veriq Agent</a>
          </div>
        )}
        {bookingLink && (
          <a href={bookingLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-sm font-semibold text-navy-900 hover:bg-slate-50">
            Booking link <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
