import { ExternalLink, MapPin } from 'lucide-react';
import type { VerifiedAddress } from '@/types/renter';
import { Button, Panel } from '@/components/ui';
import { locationLine } from './format';

/** Exact verified location — rendered only from an authorised unlocked package. */
export function VerifiedLocationCard({
  address,
  latitude,
  longitude,
  area,
  city,
  state,
}: {
  address: VerifiedAddress | null;
  latitude: number | string | null;
  longitude: number | string | null;
  area: string;
  city: string;
  state: string;
}) {
  const lat = latitude === null ? NaN : Number(latitude);
  const lng = longitude === null ? NaN : Number(longitude);
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);
  const lines = [address?.buildingName, address?.address, address?.landmark ? `Landmark: ${address.landmark}` : null]
    .filter((line): line is string => typeof line === 'string' && line.trim().length > 0);

  return (
    <Panel>
      <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <MapPin aria-hidden="true" className="h-4 w-4 text-primary" /> Verified location
      </h3>
      {lines.length > 0 ? (
        <div className="space-y-0.5 text-ui-md">
          {lines.map((line) => (
            <p
              key={line}
              className={line.startsWith('Landmark') ? 'text-ui-sm text-muted-foreground' : 'font-semibold text-foreground'}
            >
              {line}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-ui-md text-muted-foreground">
          The verified street address has not been recorded for this listing yet.
        </p>
      )}
      <p className="mt-1 text-ui-md text-muted-foreground">{locationLine(area, city, state)}</p>
      {hasCoordinates && (
        <Button asChild variant="secondary" size="small" className="mt-4">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" /> Open in Maps
          </a>
        </Button>
      )}
    </Panel>
  );
}
