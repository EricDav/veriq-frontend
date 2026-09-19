import { ApiError, propertiesApi } from '@/lib/api';
import { propertyPackageApi } from '@/lib/api/renter';
import type { ConsultationAccess, Property } from '@/types';
import type { UnlockedPropertyWithStreet } from '@/types/renter';

export interface PropertyViewerState {
  /** Public projection when locked; full property when unlocked or managed. */
  property: Property;
  publicProperty: Property | null;
  unlocked: UnlockedPropertyWithStreet | null;
}

/**
 * Loads a property for the current viewer. Protected data is only ever taken from the
 * server-authorised unlocked package; the public endpoint never carries it.
 * Returns null when the property is neither publicly visible nor unlocked for this viewer.
 */
export async function loadPropertyForViewer(id: string, isAuthenticated: boolean): Promise<PropertyViewerState | null> {
  const publicProperty = await propertiesApi.getById(id).then((res) => res.data).catch((err) => {
    if (err instanceof ApiError && err.statusCode === 404) return null;
    throw err;
  });

  let unlocked: UnlockedPropertyWithStreet | null = null;
  if (isAuthenticated) {
    unlocked = await propertyPackageApi.unlocked(id).then((res) => res.data).catch((err) => {
      if (err instanceof ApiError && [401, 403, 404].includes(err.statusCode)) return null;
      throw err;
    });
  }

  if (unlocked) {
    return {
      property: { ...unlocked.property, units: publicProperty?.units, availabilitySummary: publicProperty?.availabilitySummary },
      publicProperty,
      unlocked,
    };
  }
  return publicProperty ? { property: publicProperty, publicProperty, unlocked: null } : null;
}

/** Adapts the unlocked package to the legacy access shape used by existing report components. */
export function toConsultationAccess(pkg: UnlockedPropertyWithStreet | null): ConsultationAccess | null {
  if (!pkg || pkg.access.level !== 'unlocked') return null;
  const agent = pkg.agentSupport;
  return {
    hasAccess: true,
    consultationId: pkg.access.consultationId ?? undefined,
    accessExpiresAt: pkg.access.accessExpiresAt ?? undefined,
    unlockedAt: pkg.access.unlockedAt ?? undefined,
    bookingLink: pkg.bookingLink,
    contactAllowed: !!agent,
    agentContact: agent
      ? { agentId: pkg.property.agentId, agentName: agent.name, phone: agent.phone, businessName: pkg.property.agent?.businessName ?? null }
      : null,
  };
}
