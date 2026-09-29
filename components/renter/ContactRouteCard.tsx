import { MessageCircle, Phone, ShieldCheck, UserRound } from 'lucide-react';
import type { ContactRoute } from '@/types/renter';
import { cn } from '@/lib/utils';
import { Button, Eyebrow } from '@/components/ui';

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
    <div
      className={cn(
        'flex flex-col gap-4 rounded-unit border p-[17px] wide:flex-row wide:items-center wide:justify-between',
        isAgent ? 'border-[#10b98130] bg-[#10b9810b]' : 'border-[#ffffff18] bg-[#070b1444]',
      )}
    >
      <div className="min-w-0">
        <Eyebrow>{title}</Eyebrow>
        <p className="mt-0.5 flex items-center gap-2 font-semibold text-foreground">
          {isAgent ? (
            <ShieldCheck aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-primary" />
          ) : (
            <UserRound aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{contact.name}</span>
        </p>
        <p className="mt-0.5 text-ui-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {contact.whatsappUrl && (
          <Button asChild size="small">
            <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" className="h-4 w-4" /> WhatsApp
            </a>
          </Button>
        )}
        {!isAgent && (
          <Button asChild variant="secondary" size="small">
            <a href={`tel:${contact.phone}`}>
              <Phone aria-hidden="true" className="h-4 w-4" /> {contact.phone}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
