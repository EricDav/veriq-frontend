import type { OperatorPropertyCategory } from '@/types/operator';
import type { EvidenceKindOption } from './EvidenceUploader';

/** Category-specific identity and authority evidence (§7.2–7.4). */
export function propertyEvidenceKinds(category: OperatorPropertyCategory): EvidenceKindOption[] {
  const identity: EvidenceKindOption = {
    kind: 'identity',
    help: 'Government-issued ID (NIN slip, international passport, driver’s licence or voter’s card) for identity verification.',
  };
  const business: EvidenceKindOption = {
    kind: 'business_registration',
    help: 'CAC certificate or equivalent where you operate through a registered business.',
  };
  const other: EvidenceKindOption = { kind: 'other', help: 'Any other document that helps your Veriq Agent verify this Property.' };
  if (category === 'residential') {
    return [
      {
        kind: 'ownership',
        help: 'Title or allocation documents, purchase evidence, property tax/levy receipts, or landlord-issued tenancy documents that name you as owner.',
      },
      identity,
      business,
      other,
    ];
  }
  return [
    {
      kind: 'operating_authority',
      help: 'Ownership evidence, management/operating agreement, lease or sublease rights, owner authorisation or booking-platform operator records.',
    },
    identity,
    business,
    {
      kind: 'ownership',
      help: 'Ownership evidence, if you own the accommodation you operate.',
    },
    other,
  ];
}

/** Shared Property requires identity, occupancy and the permission declaration (§6.4, C.4). */
export const SHARED_EVIDENCE_KINDS: EvidenceKindOption[] = [
  {
    kind: 'occupancy',
    required: true,
    help: 'Current tenancy agreement, rent receipt or utility bill in your name for this home.',
  },
  { kind: 'identity', help: 'Government-issued ID for identity verification.' },
  {
    kind: 'landlord_confirmation',
    help: 'Written landlord or co-tenant consent to share, where your tenancy requires it.',
  },
  { kind: 'permission_declaration', help: 'A signed copy of your sharing permission declaration, if you have one.' },
  { kind: 'other', help: 'Any other document that helps your Veriq Agent verify this opportunity.' },
];
