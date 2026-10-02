export type FAQItem = { q: string; a: string };
export type FAQCategory = { label: string; value: string };

/**
 * The prototype's FAQ has no category bar, so the public page does not render one. The admin content
 * editor still offers the field, and starts it empty rather than seeding topics nothing displays.
 */
export const DEFAULT_FAQ_CATEGORIES: FAQCategory[] = [];

/**
 * Bumped whenever the shipped answers change, so CMS-managed FAQ content written against an older set
 * is ignored rather than mixed with this one. `app/faq/page.tsx` compares it to `data.faqVersion`.
 */
export const FAQ_CONTENT_VERSION = '2026-10-01';

/**
 * The prototype's `#faq`, in its order and its words — nine questions, nine answers, nothing else.
 * The page is matched to the prototype, so an answer is only changed here when the prototype changes.
 */
export const DEFAULT_FAQS: FAQItem[] = [
  {
    q: 'Do I need to top up a wallet?',
    a: 'No. Click Unlock to go directly to checkout. Existing refund credit applies automatically; pay only any remaining balance.',
  },
  {
    q: 'How long does access last?',
    a: '24 hours by default, starting after successful settlement. Free unlocks are also time-bound.',
  },
  {
    q: 'Does one unlock cover every unit?',
    a: 'One property unlock covers all documented verified units in that property. Each shared opportunity has its own scope.',
  },
  {
    q: 'Can I unlock an unavailable property?',
    a: 'Residential Property, Short Let and Hostel listings remain unlockable for planning with a clear unavailable disclosure. Unavailable Shared opportunities and sold/withdrawn sales are hidden by default.',
  },
  {
    q: 'How do refunds work?',
    a: 'Request through Unlock history within 24 hours and provide evidence. If Admin approves, your wallet is automatically credited. Refunded access is revoked.',
  },
  {
    q: 'Who can share Street Intelligence?',
    a: 'Unlocked users can share the standalone street link to people who know the street. It does not share private property information or access.',
  },
  {
    q: 'What if Street Intelligence does not exist?',
    a: 'The Veriq Agent manually supplies a street-level record labelled Initial Veriq Intelligence, with source and timestamp, and links it to the property.',
  },
  {
    q: 'Is listing free?',
    a: 'Yes, under the current model. Operators receive no unlock earnings.',
  },
  {
    q: 'Can a caretaker create a Residential Property owner account?',
    a: 'Residential Property accounts belong to owners. A caretaker can be added as a replaceable property contact.',
  },
];
