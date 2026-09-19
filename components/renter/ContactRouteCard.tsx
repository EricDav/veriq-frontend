import { MessageCircle, Phone, ShieldCheck, UserRound } from 'lucide-react';
import type { ContactRoute } from '@/types/renter';

/** Unlock-only contact capability: WhatsApp with a pre-filled reference, plus a direct call fallback (§13). */
export function ContactRouteCard({
  contact,
  title,
  description,
  variant = 'contact',
}: {
  contact: ContactRoute;
  title: string;
  description: string;
  variant?: 'contact' | 'agent';
}) {
  const isAgent = variant === 'agent';
  return (
    <div className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${isAgent ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
        <p className="mt-0.5 flex items-center gap-2 font-semibold text-navy-900">
          {isAgent ? <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-600" /> : <UserRound className="h-4 w-4 flex-shrink-0 text-slate-400" />}
          <span className="truncate">{contact.name}</span>
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {contact.whatsappUrl && (
          <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-primary !px-4 !py-2 !text-sm">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        )}
        {!isAgent && (
          <a href={`tel:${contact.phone}`} className="btn-outline !px-4 !py-2 !text-sm">
            <Phone className="h-4 w-4" /> {contact.phone}
          </a>
        )}
      </div>
    </div>
  );
}
