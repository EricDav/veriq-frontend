export type FAQItem = { q: string; a: string; categories?: string[] };
export type FAQCategory = { label: string; value: string };

/**
 * Bumped whenever the shipped answers change, so CMS-managed FAQ content written against an older set
 * is ignored rather than mixed with this one. `app/faq/page.tsx` compares it to `data.faqVersion`.
 */
export const FAQ_CONTENT_VERSION = '2026-09-29';

/**
 * The first nine entries are the prototype's `#faq`, in its order. Everything after them is ours: the
 * prototype has nine questions and no content system, while this page is CMS-backed and carries the
 * categories, so questions the prototype has no room for are kept rather than dropped.
 *
 * Every answer here is checked against Master Blueprint v1.0. Where an older answer described the
 * retired public-agent model — agents listing properties, agent trust scores, a 40/60 unlock revenue
 * share, agent withdrawals — it is gone: Blueprint §2 and §8 make Veriq Agents internal and
 * Admin-created, and the prototype's own "Is listing free?" answer says Operators receive no unlock
 * earnings.
 */
export const DEFAULT_FAQS: FAQItem[] = [
  {
    q: 'Do I need to top up a wallet?',
    a: 'No. Click Unlock to go directly to checkout. Existing refund credit applies automatically; pay only any remaining balance.',
    categories: ['unlock', 'payment'],
  },
  {
    q: 'How long does access last?',
    a: '24 hours by default, starting after successful settlement. The exact expiry time is shown on your unlock. Free unlocks are also time-bound.',
    categories: ['unlock'],
  },
  {
    q: 'Does one unlock cover every unit?',
    a: 'One property unlock covers all documented verified units in that property. Each shared opportunity has its own scope.',
    categories: ['unlock'],
  },
  {
    // The prototype answers this one "Residential Property, Short Let and Hostel listings remain
    // unlockable for planning with a clear unavailable disclosure." That is wrong for this product and
    // is deliberately not reproduced: Master Blueprint §5 says a property with no available unit
    // "stays visible as Currently Unavailable, but paid unlock and direct Operator or Caretaker contact
    // are disabled", and requires notify-me, similar available properties and Street Intelligence
    // instead — which is what the backend enforces and what the rest of the UI already does (§9:
    // "do not accept money for a property with no available unit"). The blueprint wins over the
    // prototype on product rules; the prototype only wins on design.
    q: 'Can I unlock an unavailable property?',
    a: 'No. When no unit is available the property stays visible as Currently Unavailable, and both paid unlock and direct operator or caretaker contact are disabled — Veriq does not take money for a property with nothing to let.\nInstead you can ask to be notified when a unit becomes available, browse similar available properties, and read the street’s own Street Intelligence record, which is never locked behind a property.',
    categories: ['unlock'],
  },
  {
    q: 'How do refunds work?',
    a: 'Request through Unlock history within 24 hours and provide evidence. Your assigned Agent confirms or Admin decides; if it is approved your wallet is credited automatically and the refunded access is revoked.\nA request qualifies where the unit was available when you paid, is confirmed unavailable within your access period, you did not take it, and the request arrives before your access expires.',
    categories: ['payment', 'unlock'],
  },
  {
    q: 'Who can share Street Intelligence?',
    a: 'Unlocked users can share the standalone street link to people who know the street. It does not share private property information or access.',
    categories: ['street-intelligence'],
  },
  {
    q: 'What if Street Intelligence does not exist?',
    a: 'The Veriq Agent manually supplies a street-level record labelled Initial Veriq Intelligence, with source and timestamp, and links it to the property. Where the street itself is new, it goes to Admin for approval first.',
    categories: ['street-intelligence'],
  },
  {
    q: 'Is listing free?',
    a: 'Yes, under the current model. Operators receive no unlock earnings.',
    categories: ['operator'],
  },
  {
    q: 'Can a caretaker create a Residential Property owner account?',
    a: 'Residential Property accounts belong to owners. A caretaker can be added as a replaceable property contact.',
    categories: ['operator'],
  },

  {
    q: 'What is Veriq Property?',
    a: 'Veriq Property is a property intelligence platform rather than a listing board. It helps you understand a property, its units and its street before you spend a morning and a transport fare finding out in person.\nOperators supply the facts, units and media; an assigned Veriq Agent verifies the submission, links Street Intelligence and publishes; you unlock the full package when a property looks worth a closer look.',
    categories: ['general'],
  },
  {
    q: 'Is Veriq Property a real estate agency?',
    a: 'No. Veriq is not an agency, landlord, developer or property owner.\nProperties are supplied by Property Operators — owners, short let and hostel operators, caretakers and current residents — who remain responsible for the property and for the eventual transaction.',
    categories: ['general'],
  },
  {
    q: 'Does Veriq own the properties on the platform?',
    a: 'No. Unless expressly stated otherwise, Veriq does not own what it publishes. The owner or operator remains responsible for the property and the transaction.',
    categories: ['general'],
  },
  {
    q: 'Does Veriq guarantee a property?',
    a: 'No. Veriq verifies and structures information so you can decide well. It does not guarantee that a property stays available, that every detail stays unchanged, or that a transaction succeeds — and document review is never a legal title guarantee.',
    categories: ['general', 'safety'],
  },
  {
    q: 'Where is Veriq available?',
    a: 'Veriq is running a Rivers State pilot, beginning with Port Harcourt and Obio Akpor. Coverage grows as more properties, streets and intelligence are verified.',
    categories: ['general'],
  },
  {
    q: 'What can I see before unlocking?',
    a: 'Enough to judge whether a property is worth a closer look: the category, the general area, the verified cover image, the documented unit types with their basic prices, and clear availability labels.\nThe exact address and coordinates, protected images, full intelligence and direct contacts stay locked until you unlock.',
    categories: ['unlock', 'property-intelligence'],
  },
  {
    q: 'Why is the full intelligence behind a fee?',
    a: 'The fee is for verified property intelligence and the access that comes with it — structured condition, utility, access and environmental information, protected images, all documented units, the linked street record and the direct contact route — not for viewing a listing.\nThe basics stay free precisely so you can decide whether unlocking is worth it.',
    categories: ['unlock', 'payment'],
  },
  {
    q: 'Does unlocking reserve the property?',
    a: 'No. An unlock gives you the intelligence and the contact route for 24 hours. It does not hold the unit, and someone else can still take it.',
    categories: ['unlock'],
  },
  {
    q: 'Does the unlock fee include rent, agency or inspection fees?',
    a: 'No. It is separate from rent, caution and legal fees, service charges, deposits and transport.\nVeriq has no agency fee and no inspection fee, and Operators agree not to collect agency, inspection, finder, connection or disguised fees from renters introduced through Veriq.',
    categories: ['payment'],
  },
  {
    q: 'Do I need an account to browse?',
    a: 'No. Browsing and public listing information are open to everyone.\nAn account is needed to unlock a property, claim a free unlock, reach protected contacts, or use anything tied to you such as your wallet, unlock history or availability alerts.',
    categories: ['unlock', 'general'],
  },
  {
    q: 'What is a free unlock?',
    a: 'Some properties are published with the unlock fee waived and are labelled clearly. A free unlock is time-bound in the same way a paid one is, and an account is still required to claim it.',
    categories: ['unlock'],
  },
  {
    q: 'What do the availability labels mean?',
    a: 'The Operator or the assigned Agent updates each unit as soon as it is taken or genuinely becomes available, so a label reflects the last confirmed position rather than a promise about tomorrow.\nIf a unit turns out to have been unavailable when you paid, that is what the refund route is for.',
    categories: ['unlock', 'property-intelligence'],
  },
  {
    q: 'What is Property Intelligence?',
    a: 'Structured information about one specific property and its units, recorded through fixed selections rather than free text so answers stay comparable.\nDepending on the property it covers condition, utilities and electricity, network quality, noise, security feel, road access, compound culture, flooding during heavy rain, detailed images and an optional Agent Observation for professional context.',
    categories: ['property-intelligence'],
  },
  {
    q: 'How is Property Intelligence different from Street Intelligence?',
    a: 'Property Intelligence describes one property and its units. Street Intelligence describes the street, estate or road around it, is community-powered, and is linked to a property but never sourced from a property page.\nTogether they tell you about the place and about the neighbourhood you would be living in.',
    categories: ['property-intelligence', 'street-intelligence'],
  },
  {
    q: 'What does Street Intelligence cover?',
    a: 'Everyday conditions on a street: flood risk, electricity, network coverage and best network, noise and its source, security feel, road access, drainage and what the street is like during heavy rain.\nEach record shows its source, its confidence and when it was last updated.',
    categories: ['street-intelligence'],
  },
  {
    q: 'How does Veriq decide what a street record says?',
    a: 'From verified community contributions. Where enough people who know the street have contributed, their answers and the voting outcome set what is displayed, and the number of contributors is shown so you can weigh it.\nUntil then the record stays labelled Initial Veriq Intelligence, and community contributions replace it once the threshold is reached.',
    categories: ['street-intelligence'],
  },
  {
    q: 'Can Street Intelligence be manipulated?',
    a: 'Manipulation is prohibited. Creating multiple accounts, coordinating submissions or misrepresenting familiarity with a street may lead to rejected contributions, restricted contributor privileges or a suspended account.\nContributors may be asked to satisfy account, familiarity and verification requirements before their answers count.',
    categories: ['street-intelligence', 'safety'],
  },
  {
    q: 'My street is not listed. What now?',
    a: 'Propose it. A proposal carries the State, LGA and Veriq Area so Admin can review it, and the street becomes selectable once it is approved.',
    categories: ['street-intelligence'],
  },
  {
    q: 'Who checks a property before it is published?',
    a: 'A verified Operator submits the property, units, images, intelligence, prices and availability, and actively accepts the listing declaration.\nThe assigned Veriq Agent then calls and completes a live video verification, compares the live property to the submission, requests corrections, links or supplies Street Intelligence, and publishes only when the information is accurate enough. Material actions, corrections and escalations are recorded.',
    categories: ['operator', 'safety'],
  },
  {
    q: 'What does a Veriq Agent do, and can I become one?',
    a: 'A Veriq Agent is internal staff, not a marketplace agent: they verify the operator and the property, review intelligence, link or create street records, publish, support renters after an unlock and record their decisions.\nAgent accounts are created by Admin, so they cannot be registered from the public site. The public account types are Renter and Property Operator.',
    categories: ['operator', 'general'],
  },
  {
    q: 'What does an Operator need before posting?',
    a: 'Signing up takes an operator category, full name, email and acceptance of the Operator Terms; a phone number is optional at that point.\nBefore posting, a phone OTP, a valid government ID and a selfie holding that ID are required, and Veriq may ask for limited further evidence of identity, role or authority. Verification confirms the person — it does not confirm ownership of every property they later submit.',
    categories: ['operator'],
  },
  {
    q: 'Can two Operators list the same property?',
    a: 'No. Each physical property has one permanent Veriq Property ID, and duplicate submissions are corrected, merged or rejected during review.\nIf a property changes hands or its contact changes, the existing record is updated rather than listed again.',
    categories: ['operator'],
  },
  {
    q: 'Will an approved refund come back as cash?',
    a: 'No. An approved refund becomes Veriq Wallet credit for another unlock rather than an automatic cash return.\nThe credit does not expire and can be spent on any eligible unlock, in any category.',
    categories: ['payment'],
  },
  {
    q: 'What does not qualify for a refund?',
    a: 'Changing your mind after unlocking, deciding not to inspect, choosing another property, letting the access period pass unused, or a unit that was genuinely available when you paid and was legitimately taken afterwards.\nA mismatch with personal preference does not qualify where the published information was materially accurate.',
    categories: ['payment'],
  },
  {
    q: 'Are payments on Veriq secure?',
    a: 'Platform payments run through supported payment providers inside Veriq’s own checkout, and every unlock, wallet credit and refund is recorded in the ledger.\nOnly ever pay a Veriq fee through the checkout shown in Veriq. Treat anyone asking you to send an unlock fee another way as a fraud attempt.',
    categories: ['payment', 'safety'],
  },
  {
    q: 'How does Veriq keep misleading listings out?',
    a: 'Operator identity verification, live video verification of each property by the assigned Agent, structured intelligence fields with no Unknown option, an availability duty on every unit, recorded review decisions, the refund route and enforcement against repeat offenders.\nThese reduce risk substantially but cannot eliminate every inaccurate or dishonest submission, which is why inspection still matters.',
    categories: ['safety'],
  },
  {
    q: 'Does a verified badge mean Veriq guarantees the property?',
    a: 'No. Read a badge for exactly what it verifies: that a specific Veriq check was completed. It is not a guarantee of the operator’s future conduct, of every detail of the property, or of the outcome of your transaction.',
    categories: ['safety'],
  },
  {
    q: 'Should I still inspect the property?',
    a: 'Yes, always. Property Intelligence and Street Intelligence exist to help you decide what is worth visiting and what to look for when you get there.\nThey do not replace a physical inspection, legal due diligence, title verification or professional advice.',
    categories: ['safety'],
  },
  {
    q: 'How do I reach Veriq?',
    a: 'Use the contact page or the support options inside the platform. For anything about an unlocked property, open it from your unlock history — the operator contact and your assigned Agent’s WhatsApp support are there.\nUse official Veriq channels rather than contact details supplied by an unknown third party.',
    categories: ['support'],
  },
];

export const DEFAULT_FAQ_CATEGORIES: FAQCategory[] = [
  { label: 'All', value: 'all' },
  { label: 'Unlocks & access', value: 'unlock' },
  { label: 'Payments & refunds', value: 'payment' },
  { label: 'Property Intelligence', value: 'property-intelligence' },
  { label: 'Street Intelligence', value: 'street-intelligence' },
  { label: 'Listing & Operators', value: 'operator' },
  { label: 'Safety & trust', value: 'safety' },
  { label: 'About Veriq', value: 'general' },
  { label: 'Support', value: 'support' },
];
