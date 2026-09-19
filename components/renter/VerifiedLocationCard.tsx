import { ExternalLink, MapPin } from 'lucide-react';
import type { VerifiedAddress } from '@/types/renter';
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
    <div className="card p-6">
      <h3 className="font-display mb-3 flex items-center gap-2 text-base font-bold text-navy-900">
        <MapPin className="h-4 w-4 text-veriq-secondary" /> Verified location
      </h3>
      {lines.length > 0 ? (
        <div className="space-y-0.5 text-sm text-navy-900">
          {lines.map((line) => <p key={line} className={line.startsWith('Landmark') ? 'text-xs text-slate-500' : 'font-semibold'}>{line}</p>)}
        </div>
      ) : (
        <p className="text-sm text-veriq-muted">The verified street address has not been recorded for this listing yet.</p>
      )}
      <p className="mt-1 text-sm text-slate-500">{locationLine(area, city, state)}</p>
      {hasCoordinates && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline mt-4 !px-4 !py-2 !text-sm"
        >
          <ExternalLink className="h-4 w-4" /> Open in Maps
        </a>
      )}
    </div>
  );
}
