export type FAQItem = { q: string; a: string; categories?: string[] };
export type FAQCategory = { label: string; value: string };

export const FAQ_CONTENT_VERSION = '2026-08-09';

export const DEFAULT_FAQS: FAQItem[] = [
  {
    "q": "What is Veriq Property?",
    "a": "Veriq Property is a property intelligence platform designed to help people make better property decisions before physical inspection.\nInstead of simply showing property listings, Veriq helps users understand the property, the street, and the agent before deciding whether a property is worth visiting.\nDepending on the property and location, Veriq may provide Property Intelligence, Street Intelligence, listing freshness information, agent trust signals, estimated move-in costs, and other decision-support information.",
    "categories": [
      "general"
    ]
  },
  {
    "q": "Is Veriq Property a real estate agency?",
    "a": "No. Veriq Property is a property intelligence platform, not a real estate agency, landlord, property developer, or property owner.\nProperties on the platform are listed by independent agents, property professionals, owners, or other approved participants.",
    "categories": [
      "general"
    ]
  },
  {
    "q": "Does Veriq Property own the listed properties?",
    "a": "No. Unless expressly stated otherwise, Veriq Property does not own the properties displayed on the platform.\nThe relevant property owner, landlord, agent, or property professional remains responsible for the property and the eventual transaction.",
    "categories": [
      "general"
    ]
  },
  {
    "q": "Does Veriq Property guarantee properties?",
    "a": "No.\nVeriq provides structured information and trust signals to help users make better decisions, but it does not guarantee that a property will remain available, that every detail will remain unchanged, or that a particular transaction will be successful.\nUsers should physically inspect properties and independently confirm important information before making payments or commitments.",
    "categories": [
      "general"
    ]
  },
  {
    "q": "Is Veriq Property available only in Port Harcourt?",
    "a": "Veriq Property is launching with an initial focus on Port Harcourt and surrounding supported locations.\nCoverage will expand progressively as more properties, agents, locations, and intelligence become available.",
    "categories": [
      "general"
    ]
  },
  {
    "q": "What can I see before unlocking a Property Intelligence report?",
    "a": "Before unlocking, users can see enough basic information to decide whether a property may be worth considering.\nDepending on the listing, this may include:\n• Property photos or preview images\n• Property type\n• Location\n• Rent or price\n• Number of bedrooms and bathrooms\n• Estimated move-in costs\n• Listing freshness or availability status\n• Listing agent information\n• Agent verification and available performance indicators\n• The Property Intelligence access fee\n• An overview of what the full report contains\nThe detailed Property Intelligence itself remains locked until the applicable access requirement is completed.",
    "categories": [
      "property-user"
    ]
  },
  {
    "q": "Why do I need to pay before seeing the full Property Intelligence?",
    "a": "The access fee is for the Property Intelligence report and related consultation access, not simply for viewing a property listing.\nThe report may contain structured information, additional images, property condition information, disclosures, utility and access information, environmental observations, and other details intended to help you determine whether the property is worth physically inspecting.\nBasic property information remains available before you decide whether to unlock the report.",
    "categories": [
      "property-user"
    ]
  },
  {
    "q": "Does paying the Intelligence Access Fee reserve the property?",
    "a": "No.\nUnlocking Property Intelligence does not reserve the property or guarantee that another person will not rent or take the property.\nThe payment gives you access to the relevant intelligence and associated features for the stated access period.",
    "categories": [
      "property-user"
    ]
  },
  {
    "q": "Does the Intelligence Access Fee include rent, agency fee or inspection fee?",
    "a": "No. The Intelligence Access Fee is separate from:\n• Rent\n• Agency fee\n• Legal fee\n• Caution fee\n• Service charge\n• Inspection fee\n• Property deposit\n• Transportation expenses\n• Any other property-related payment\nAny applicable property charges should be confirmed separately.",
    "categories": [
      "property-user"
    ]
  },
  {
    "q": "How long can I access an unlocked Property Intelligence report?",
    "a": "The applicable access period will be shown before you unlock the report.\nWhere access is time-limited, the expiry period will be clearly displayed on the platform.",
    "categories": [
      "property-user"
    ]
  },
  {
    "q": "What is a Free Intelligence Unlock?",
    "a": "Some properties may occasionally offer Property Intelligence without the normal access fee.\nThese may appear as Free Intelligence, Free Unlock, or a similar label.\nFree unlocks are promotional or limited offers and may not always be available. Users may still need a Veriq account to claim a free unlock.",
    "categories": [
      "property-user"
    ]
  },
  {
    "q": "Do I need an account to browse properties?",
    "a": "No. Users should be able to browse available properties and view public listing information without creating an account.\nAn account may be required when you want to unlock Property Intelligence, claim a free unlock, access protected agent contact information, or use certain personalised platform features.",
    "categories": [
      "property-user"
    ]
  },
  {
    "q": "Why do listings expire automatically?",
    "a": "Property availability changes quickly.\nVeriq requires listings to be reconfirmed periodically so that old or unavailable properties do not remain indefinitely on the platform.\nListings that are not refreshed within the required period may automatically expire, be hidden, or require reconfirmation before becoming visible again. This is part of Veriq's listing-freshness system.",
    "categories": [
      "property-user"
    ]
  },
  {
    "q": "What does “Availability Confirmed” mean?",
    "a": "It means the listing's availability was reconfirmed within the period indicated by Veriq.\nIt does not guarantee that the property will still be available later because property availability can change at any time.",
    "categories": [
      "property-user"
    ]
  },
  {
    "q": "Does Veriq Property handle rent payments?",
    "a": "At present, Veriq's core payment function relates to platform services such as Property Intelligence access.\nRent, agency fees, inspection fees, deposits, and other property transaction payments are generally handled between the relevant parties unless Veriq expressly introduces and identifies a supported payment service for such transactions.",
    "categories": [
      "property-user"
    ]
  },
  {
    "q": "What is Property Intelligence?",
    "a": "Property Intelligence is structured information designed to help you understand a specific property before deciding whether to physically inspect it.\nDepending on the property, it may cover information such as:\n• Property condition\n• Detailed images\n• Utilities\n• Access\n• Relevant disclosures\n• Environmental observations\n• Compound or surrounding conditions\n• Estimated costs\n• Agent observations\n• Other inspection-related information\nIt is decision-support information and does not replace physical inspection or professional due diligence.",
    "categories": [
      "property-intelligence"
    ]
  },
  {
    "q": "Is Property Intelligence the same as Street Intelligence?",
    "a": "No.\nProperty Intelligence is about a specific property.\nStreet Intelligence is about the location surrounding a street, estate, road, or other recognised addressable location.\nTogether, they help users understand both the property and its wider environment.",
    "categories": [
      "property-intelligence"
    ]
  },
  {
    "q": "What is Street Intelligence?",
    "a": "Street Intelligence is Veriq's community-powered location intelligence system.\nIt helps users understand everyday conditions around a street, estate, road, or other supported location before choosing a property there.\nIt may cover areas such as flood risk, electricity, network coverage, noise, security feel, road access, drainage, and other relevant living conditions.",
    "categories": [
      "street-intelligence"
    ]
  },
  {
    "q": "Who provides Street Intelligence?",
    "a": "Street Intelligence is community-based.\nEligible users who are familiar with a location can contribute structured intelligence about that location.\nStreet Intelligence is separate from the Property Intelligence submitted through the property-listing process.",
    "categories": [
      "street-intelligence"
    ]
  },
  {
    "q": "How does Veriq decide which Street Intelligence result to display?",
    "a": "Veriq uses a community voting system.\nWhen sufficient verified community contributions are available for a location, the system uses those contributions and the voting outcome to determine the intelligence displayed.\nThe number of contributors and other confidence indicators may also be shown to help users understand the strength of the available information.",
    "categories": [
      "street-intelligence"
    ]
  },
  {
    "q": "What happens when a location does not yet have enough community contributions?",
    "a": "Where sufficient community contributions have not yet been received, Veriq may display Initial Intelligence based on available structured research and information.\nOnce the required community contribution threshold is reached, the community voting result can replace or update the initial intelligence.",
    "categories": [
      "street-intelligence"
    ]
  },
  {
    "q": "Is Street Intelligence guaranteed to be completely accurate?",
    "a": "No.\nStreet Intelligence reflects available community contributions and information at a particular time.\nConditions can change, and people's experiences may differ. Users should treat Street Intelligence as decision-support information and make independent enquiries before making an important property decision.",
    "categories": [
      "street-intelligence"
    ]
  },
  {
    "q": "Who can contribute Street Intelligence?",
    "a": "Eligible users who genuinely know or are familiar with a location may contribute.\nVeriq may require contributors to satisfy account, location-familiarity, verification, or other eligibility requirements before their contributions are accepted or counted.",
    "categories": [
      "street-intelligence"
    ]
  },
  {
    "q": "Can someone manipulate Street Intelligence by submitting many votes?",
    "a": "Manipulation is prohibited.\nUsers must not create multiple accounts, coordinate false submissions, misrepresent their familiarity with a location, or otherwise attempt to manipulate Street Intelligence results.\nVeriq may reject contributions, restrict contributor privileges, or suspend accounts where abuse is detected.",
    "categories": [
      "street-intelligence"
    ]
  },
  {
    "q": "What if I cannot find my street, estate or road?",
    "a": "You can use the Suggest a Location feature.\nThe proposed location will be submitted for review before it can be added to Veriq's recognised location database.",
    "categories": [
      "street-intelligence"
    ]
  },
  {
    "q": "How are agents verified?",
    "a": "Veriq may require agents to provide identity and other relevant verification information before receiving a verification status.\nAn Agent Verified or Identity Verified badge means that the applicable Veriq verification requirements have been completed.\nIt does not mean Veriq guarantees every property submitted by that agent or guarantees the agent's future conduct.",
    "categories": [
      "agent"
    ]
  },
  {
    "q": "What are Agent Trust Scores?",
    "a": "Agent Trust Scores and performance indicators are designed to help users evaluate agents using available platform activity and performance data.\nDepending on the system in use, indicators may consider factors such as:\n• Listing accuracy\n• Listing freshness\n• Response reliability\n• Inspection success\n• Consultation history\n• User feedback\n• Property availability performance\nThese are trust signals, not guarantees of future performance.",
    "categories": [
      "agent"
    ]
  },
  {
    "q": "Can agents lose visibility or be suspended?",
    "a": "Yes.\nAgents who repeatedly submit stale, misleading, unavailable, fraudulent, or otherwise non-compliant listings may face actions such as:\n• Reduced visibility\n• Lower trust indicators\n• Removal of listings\n• Temporary restrictions\n• Suspension\n• Loss of special status\n• Payment or commission restrictions\n• Permanent removal in serious cases",
    "categories": [
      "agent"
    ]
  },
  {
    "q": "Can multiple agents list the same property?",
    "a": "Yes, where multiple legitimate agents have authority to market the same property.\nEach listing remains connected to the agent who submitted it, and each agent remains responsible for the accuracy, freshness, and conduct associated with their own listing.\nVeriq may moderate duplicate or suspicious listings to prevent abuse or unnecessary clutter.",
    "categories": [
      "agent"
    ]
  },
  {
    "q": "Why does Veriq track agent performance?",
    "a": "Verification confirms identity, but identity alone does not tell users how well an agent performs.\nPerformance tracking helps users consider factors such as listing accuracy, freshness, responsiveness, and inspection outcomes when deciding who to engage with.",
    "categories": [
      "agent"
    ]
  },
  {
    "q": "Can agents withdraw earnings immediately?",
    "a": "Not necessarily.\nAgent earnings may remain in a pending or review state for a defined period before becoming available for withdrawal.\nThis allows Veriq to review qualifying transactions and address issues such as unavailable or misleading listings before releasing applicable earnings.",
    "categories": [
      "agent"
    ]
  },
  {
    "q": "What is the minimum withdrawal amount for agents?",
    "a": "The current minimum withdrawal threshold is ₦5,000, subject to Veriq's prevailing agent payout rules.\nVeriq may update withdrawal thresholds, review periods, or payout conditions as the platform develops.",
    "categories": [
      "agent"
    ]
  },
  {
    "q": "Can agent earnings be reversed or withheld?",
    "a": "Yes, in qualifying cases.\nWhere an earning is linked to a property that is found to be fraudulent, materially misleading, duplicated, improperly listed, or otherwise in violation of Veriq's policies, the associated earning may be withheld, reversed, or adjusted in accordance with the applicable agent rules.",
    "categories": [
      "agent"
    ]
  },
  {
    "q": "What happens if a property is no longer available after I pay to unlock its intelligence?",
    "a": "If you unlock a Property Intelligence report and discover that the property qualifies as unavailable under Veriq's Refund Policy, you may submit the matter for review.\nIf approved, Veriq may provide the remedy allowed under the applicable policy, such as a wallet credit, replacement unlock, credit toward another eligible property, or another approved remedy.\nNot every case of a property later becoming unavailable automatically qualifies.",
    "categories": [
      "payment"
    ]
  },
  {
    "q": "Will I always receive a cash refund?",
    "a": "No.\nAn approved refund request does not necessarily mean money will be returned directly to your bank account or payment card.\nDepending on the applicable Refund Policy, the remedy may be provided as:\n• Veriq wallet credit\n• Replacement intelligence unlock\n• Credit toward another eligible property\n• Another approved remedy\nCash refunds may only apply where expressly provided under the applicable policy or required by law.",
    "categories": [
      "payment"
    ]
  },
  {
    "q": "What may qualify for refund or credit consideration?",
    "a": "Depending on the Refund Policy and the evidence available, qualifying circumstances may include situations such as:\n• The property was already unavailable when the user unlocked the report\n• The listing was materially stale\n• A duplicate listing caused an improper paid unlock\n• The listing contained serious material misrepresentation\n• Another qualifying circumstance expressly covered by the Refund Policy\nVeriq may investigate a claim before approving a remedy.",
    "categories": [
      "payment"
    ]
  },
  {
    "q": "What does NOT normally qualify for a refund or credit?",
    "a": "Examples that would not normally qualify include:\n• You simply changed your mind after unlocking the report\n• You no longer like the property\n• You decide not to attend an inspection\n• The property does not match your personal preferences where the information supplied was materially accurate\n• You rented or chose another property\n• You fail to use the intelligence during its access period\n• The property was genuinely available when you unlocked it but was legitimately taken afterwards, unless the applicable Refund Policy provides otherwise\n• Circumstances outside the qualifying refund rules\nThe final determination remains subject to the published Refund Policy and applicable law.",
    "categories": [
      "payment"
    ]
  },
  {
    "q": "How do I request a refund or credit review?",
    "a": "Use the refund/support option provided through Veriq or contact Veriq Support with the relevant property and unlock information.\nYou may be asked to provide information or evidence so Veriq can review the circumstances.",
    "categories": [
      "payment"
    ]
  },
  {
    "q": "Are payments on Veriq secure?",
    "a": "Platform payments are processed through supported payment providers.\nUsers should only make Veriq platform payments through the official payment process shown within Veriq.\nUsers should be cautious if anyone asks them to make a supposed Veriq Intelligence payment through an unofficial channel.",
    "categories": [
      "payment"
    ]
  },
  {
    "q": "How does Veriq Property reduce fake or misleading listings?",
    "a": "Veriq uses several mechanisms intended to improve listing quality, including:\n• Agent verification\n• Listing freshness requirements\n• Structured property information\n• Content moderation\n• Property Intelligence requirements\n• Agent performance tracking\n• Expiration of stale listings\n• User reporting\n• Enforcement actions for repeated violations\nThese measures reduce risk but cannot completely eliminate fraudulent or inaccurate behaviour.",
    "categories": [
      "safety"
    ]
  },
  {
    "q": "Does a Verified badge mean Veriq guarantees the person or property?",
    "a": "No.\nA verification badge should always be interpreted according to what it specifically verifies.\nFor example, Agent Identity Verified means the relevant agent identity-verification requirement was completed.\nIt does not mean Veriq guarantees the agent's character, every property listed by the agent, or the success of a transaction.",
    "categories": [
      "safety"
    ]
  },
  {
    "q": "Should I still inspect a property after reading the Intelligence Report?",
    "a": "Yes.\nAlways physically inspect a property before making a commitment.\nVeriq Property Intelligence and Street Intelligence are designed to help you make a more informed decision about whether to inspect and what to look out for.\nThey are not substitutes for physical inspection, legal due diligence, title verification, professional advice, or other checks appropriate to the transaction.",
    "categories": [
      "safety"
    ]
  },
  {
    "q": "How can I contact Veriq Property?",
    "a": "You can contact Veriq Property through the official Contact Us or Support options provided on the platform.\nFor account, property, payment, refund, or technical enquiries, use Veriq's official support channels rather than contact information supplied by an unknown third party.",
    "categories": [
      "support"
    ]
  }
];

export const DEFAULT_FAQ_CATEGORIES: FAQCategory[] = [
  { label: 'All', value: 'all' },
  { label: 'General', value: 'general' },
  { label: 'Property Users', value: 'property-user' },
  { label: 'Property Intelligence', value: 'property-intelligence' },
  { label: 'Street Intelligence', value: 'street-intelligence' },
  { label: 'Agents', value: 'agent' },
  { label: 'Payments & Refunds', value: 'payment' },
  { label: 'Safety & Trust', value: 'safety' },
  { label: 'Support', value: 'support' },
];

