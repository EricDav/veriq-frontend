'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Property } from '@/types';
import { propertiesApi } from '@/lib/api';
import { Eyebrow, buttonClass } from '@/components/ui';
import { PropertyCard } from '@/components/properties/PropertyCard';

/**
 * The prototype's discovery band: a section head with the claim on the left and "View all" on the
 * right, then three property cards. The prototype shows three illustrative placeholders; this shows
 * the three most recent published listings, which is the same band doing its real job.
 */
export function Discover() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    propertiesApi
      .list({ page: 1, limit: 3 })
      .then((response) => {
        if (!cancelled) setProperties(response.data.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setProperties([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="py-[25px] wide:py-10">
      <div className="mb-[25px] flex flex-col items-start justify-between gap-5 wide:flex-row wide:items-end">
        <div>
          <Eyebrow>A clearer way to find home</Eyebrow>
          <h2 className="mb-[7px] mt-3 font-display text-[clamp(1.55rem,2.6vw,2.25rem)] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground">
            Places worth knowing more about.
          </h2>
          <p className="text-muted-foreground">
            Explore a few possibilities. Unlock the full picture when you&rsquo;re ready.
          </p>
        </div>

        <Link href="/properties" className={buttonClass('ghost', 'default', 'hidden wide:inline-flex')}>
          View all
          <ArrowUpRight className="h-[17px] w-[17px]" aria-hidden="true" />
        </Link>
      </div>

      <div
        aria-live="polite"
        aria-busy={!loaded || undefined}
        className="grid gap-6 wide:grid-cols-2 min-[1051px]:grid-cols-3"
      >
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      {loaded && properties.length === 0 && (
        <p className="text-muted-foreground">
          No properties are published yet. Check back shortly.
        </p>
      )}
    </section>
  );
}
