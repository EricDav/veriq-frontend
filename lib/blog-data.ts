// ─── Blog Data ────────────────────────────────────────────────────────────────
// Static blog posts for the Veriq Property blog.
// Each post supports an optional youtubeId for embedded video content.

export type BlogCategory =
  | 'Property Intelligence'
  | 'Renting Tips'
  | 'Inspection Tips'
  | 'Location Reviews'
  | 'Scam Awareness'
  | 'Housing Trends'
  | 'Landlord & Tenant'
  | 'Relocation Guide'
  | 'Short Stay';

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  readTime: number; // minutes
  publishedAt: string; // ISO date string
  coverImage?: string; // placeholder gradient key if not set
  youtubeId?: string; // YouTube video ID for embedded video
  content: BlogSection[];
  tags: string[];
}

export interface BlogSection {
  type: 'paragraph' | 'heading' | 'list' | 'callout' | 'youtube';
  text?: string;
  items?: string[];
  youtubeId?: string;
  variant?: 'warning' | 'info' | 'tip';
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: '10-questions-to-ask-before-renting',
    title: '10 Essential Questions To Ask Before Renting A House In Nigeria',
    excerpt: 'Most renters regret moving in before asking these critical questions. Save yourself months of problems with this checklist.',
    category: 'Renting Tips',
    readTime: 6,
    publishedAt: '2025-05-10',
    tags: ['renting', 'Nigeria', 'checklist', 'landlord'],
    content: [
      { type: 'paragraph', text: 'Renting a property in Nigeria is one of the most significant financial decisions you will make. Yet most people move in based on how a property looks — without asking the critical questions that determine whether they will be comfortable for the next 12 months.' },
      { type: 'paragraph', text: 'After speaking with hundreds of renters across Port Harcourt, Lagos, and Abuja, we compiled the 10 questions that separate smart renters from those who end up frustrated.' },
      { type: 'heading', text: 'The 10 Questions' },
      {
        type: 'list',
        items: [
          'How many hours of electricity does this area get per day on average?',
          'Has this property ever flooded — and if so, how recently?',
          'What is included in the service charge and what is not?',
          'Is the landlord resident in the compound or nearby?',
          'What is the water situation — borehole, tap, or bought water?',
          'Are there any pending disputes about the property or the land?',
          'What is the notice period required before either party can exit the agreement?',
          'Who handles maintenance and repairs — landlord or tenant?',
          'What are the compound rules regarding noise, visitors, and parking?',
          'Has the property been recently renovated, and if so, what was done?',
        ],
      },
      { type: 'callout', variant: 'tip', text: 'Pro tip: Use Veriq Property\'s Quick Intelligence reports to get verified answers to questions 1, 2, 4, and 5 before you even schedule a physical inspection.' },
      { type: 'heading', text: 'Why These Questions Matter' },
      { type: 'paragraph', text: 'Nigeria\'s rental market moves fast. Agents will pressure you to pay agency fees and sign agreements quickly. But rushing this process has led many tenants to discover flooding problems, severe power issues, or landlord disputes only after moving in — when it\'s already too late to walk away easily.' },
      { type: 'paragraph', text: 'At Veriq Property, we believe intelligence should come before inspection. Know before you go.' },
    ],
  },
  {
    slug: 'common-red-flags-property-inspection',
    title: 'Common Red Flags To Watch For During A Property Inspection',
    excerpt: 'That beautiful apartment could be hiding serious problems. Here\'s what agents don\'t always tell you to check.',
    category: 'Inspection Tips',
    readTime: 7,
    publishedAt: '2025-05-18',
    tags: ['inspection', 'property condition', 'red flags', 'Nigeria'],
    content: [
      { type: 'paragraph', text: 'A property can look impeccable during an inspection — freshly painted, clean, well-lit — and still be hiding structural problems, water damage, or electrical faults that will cost you dearly.' },
      { type: 'heading', text: '1. Suspicious Paint Jobs' },
      { type: 'paragraph', text: 'Fresh paint on specific patches of wall, especially near the floor or ceiling, is often used to cover damp patches, mould, or crack repairs. Tap the wall lightly — a hollow sound suggests the plaster beneath is compromised.' },
      { type: 'heading', text: '2. Cracks Around Windows and Door Frames' },
      { type: 'paragraph', text: 'Diagonal cracks running from the corners of windows and door frames often indicate structural movement. These are more serious than hairline cracks and should always be investigated.' },
      { type: 'heading', text: '3. Ceiling Stains' },
      { type: 'paragraph', text: 'Brown or yellow stains on ceilings are telltale signs of roof leaks or plumbing issues from upper floors. Ask how old the stains are and whether the source has been fixed.' },
      { type: 'heading', text: '4. Electrical Sockets That Don\'t Work' },
      { type: 'paragraph', text: 'Always bring a phone charger or small device to test all sockets. Non-functional sockets may indicate wiring problems that are expensive to resolve.' },
      { type: 'callout', variant: 'warning', text: 'Warning: Never pay your full agency fee or caution fee before physically inspecting the property yourself. Photos and virtual tours do not reveal structural or environmental issues.' },
      { type: 'heading', text: '5. Water Pressure and Drainage' },
      { type: 'paragraph', text: 'Turn on every tap and flush every toilet. Low water pressure and slow drainage are common issues that are rarely disclosed upfront. Also check under sinks for damp patches or rust stains indicating slow leaks.' },
      {
        type: 'list',
        items: [
          'Check the compound drainage during rain or ask neighbours about flooding history',
          'Inspect the roof from outside if accessible',
          'Look for mould or condensation in bathrooms and kitchens',
          'Ask about the age of the electrical wiring',
          'Count the number of power points in each room — Nigerian apartments often have very few',
        ],
      },
    ],
  },
  {
    slug: 'port-harcourt-flood-prone-areas-2025',
    title: 'Port Harcourt Areas With Frequent Flooding: 2025 Intelligence Report',
    excerpt: 'Before you rent in PH, know which areas flood during rainy season and which have improved drainage.',
    category: 'Location Reviews',
    readTime: 8,
    publishedAt: '2025-04-22',
    tags: ['Port Harcourt', 'flooding', 'location', 'rainy season'],
    content: [
      { type: 'paragraph', text: 'Port Harcourt\'s rainy season (April – October) transforms some of the city\'s most popular rental areas into flooded zones. Despite this, many landlords and agents downplay flooding risks during inspections. This report draws on field intelligence gathered from residents across PH.' },
      { type: 'callout', variant: 'warning', text: 'Disclaimer: Flooding risk varies street by street. Always verify with current residents in the specific compound you\'re considering, not just the general area.' },
      { type: 'heading', text: 'High Flood Risk Areas' },
      {
        type: 'list',
        items: [
          'Rumuola — particularly around Rumuola Road and nearby streets. Flooding can last hours after heavy rain.',
          'Diobu (Mile 1, Mile 2, Mile 3) — low-lying terrain with limited drainage infrastructure.',
          'Borikiri — coastal proximity makes flooding common during high tides and heavy rains.',
          'Okuru-Ama — severe flooding has been reported consistently in recent years.',
          'Parts of Woji Road towards the market axis.',
        ],
      },
      { type: 'heading', text: 'Moderate Flood Risk Areas' },
      {
        type: 'list',
        items: [
          'Choba — risk varies significantly by estate. The main road floods; many estates have improved internal drainage.',
          'Rumuigbo — some streets flood while others have never had issues.',
          'Elelenwo — improved in recent years but still has pockets of poor drainage.',
        ],
      },
      { type: 'heading', text: 'Lower Flood Risk Areas' },
      {
        type: 'list',
        items: [
          'GRA (Government Reserved Area) — better drainage infrastructure, elevated terrain.',
          'Old GRA (Peter Odili Road axis) — well-maintained drainage.',
          'Trans Amadi — industrial planning means better road and drainage infrastructure.',
          'Rukpokwu — generally higher ground with fewer flood complaints.',
        ],
      },
      { type: 'callout', variant: 'info', text: 'Veriq Property agents are required to disclose flood risk when completing property intelligence reports. Look for the flood risk indicator on every listing.' },
    ],
  },
  {
    slug: 'how-to-avoid-fake-property-agents-nigeria',
    title: 'How To Spot And Avoid Fake Property Agents In Nigeria',
    excerpt: 'Thousands of Nigerians lose money to fake agents every year. Here\'s how to protect yourself before paying a single naira.',
    category: 'Scam Awareness',
    readTime: 9,
    publishedAt: '2025-05-01',
    tags: ['scam', 'fake agents', 'fraud', 'Nigeria', 'safety'],
    content: [
      { type: 'paragraph', text: 'Property fraud is one of the most common financial crimes in Nigeria. From Abuja to Lagos to Port Harcourt, fake agents collect inspection fees and agency fees for properties they have no authority to rent — sometimes collecting from multiple victims for the same apartment.' },
      { type: 'heading', text: 'Common Scam Tactics' },
      {
        type: 'list',
        items: [
          'Listing properties on social media or WhatsApp at below-market prices to attract desperate renters',
          'Asking for inspection fees upfront before any visit is arranged',
          'Using photos of real properties without the actual landlord\'s knowledge or consent',
          'Rushing you to pay agency fees before you can investigate the agent\'s credibility',
          'Claiming the property has "other interested parties" to pressure quick payment',
        ],
      },
      { type: 'heading', text: 'How To Verify An Agent' },
      {
        type: 'list',
        items: [
          'Ask for their physical office address and visit it — don\'t trust agents who only communicate via WhatsApp',
          'Check if they are registered with NIESV (Nigerian Institution of Estate Surveyors and Valuers) or REDAN',
          'Ask how long they have been operating in the area and request references from past clients',
          'Verify their identity before making any payment — request a government-issued ID',
          'Never transfer money directly to an agent\'s personal account before signing any tenancy agreement',
        ],
      },
      { type: 'callout', variant: 'tip', text: 'All agents on Veriq Property have submitted government-issued ID and selfie verification. Their verification status is clearly displayed on every listing. Only deal with Verified Agents.' },
      { type: 'heading', text: 'If You\'ve Been Scammed' },
      { type: 'paragraph', text: 'Report the fraud immediately to the Nigerian Police Force (NPF) Economic and Financial Crimes Commission (EFCC) or NFIU. Keep all records of communications, payment receipts, and any documents you signed. Many victims are too embarrassed to report — but doing so prevents the same agent from defrauding others.' },
    ],
  },
  {
    slug: 'understanding-move-in-costs-nigeria',
    title: 'Understanding Move-In Costs In Nigeria: What You\'re Actually Paying For',
    excerpt: 'Rent is just the beginning. Here\'s a clear breakdown of every fee you\'ll face when moving into a new property in Nigeria.',
    category: 'Renting Tips',
    readTime: 6,
    publishedAt: '2025-04-15',
    tags: ['move-in costs', 'agency fee', 'caution fee', 'Nigeria', 'budgeting'],
    content: [
      { type: 'paragraph', text: 'One of the biggest shocks for first-time renters in Nigeria is discovering that the annual rent is only one of several large payments required to secure a property. Here\'s a clear breakdown of every line item and what it covers.' },
      { type: 'heading', text: 'Annual Rent' },
      { type: 'paragraph', text: 'This is the base cost for occupying the property for 12 months. Most landlords in Nigeria expect at least one year\'s rent paid upfront. Premium landlords and new developments may require 2 years upfront.' },
      { type: 'heading', text: 'Agency Fee' },
      { type: 'paragraph', text: 'The agent\'s commission for finding and facilitating the property. Industry standard in Nigeria is 10% of annual rent. Some agents charge more in competitive markets. This fee is typically non-negotiable on formal lettings.' },
      { type: 'heading', text: 'Legal / Agreement Fee' },
      { type: 'paragraph', text: 'Covers the drafting and witnessing of the tenancy agreement by a lawyer. Ranges from ₦10,000 to ₦50,000 depending on property value and location. Always insist on a formal written tenancy agreement — it protects you legally.' },
      { type: 'heading', text: 'Caution / Security Deposit' },
      { type: 'paragraph', text: 'A refundable deposit typically equal to one month\'s rent, held by the landlord as security against damage beyond normal wear and tear. Ensure the refund terms are clearly written in your tenancy agreement.' },
      { type: 'heading', text: 'Service Charge' },
      { type: 'paragraph', text: 'Common in estates and apartment complexes. Covers shared services like security, generator maintenance, compound cleaning, and sometimes water. Verify exactly what is included before committing.' },
      { type: 'heading', text: 'Inspection Fee' },
      { type: 'paragraph', text: 'Some agents charge a small fee (₦2,000 – ₦10,000) to physically show you the property. This should always be refunded or offset against the agency fee if you proceed with the tenancy.' },
      { type: 'callout', variant: 'info', text: 'Veriq Property displays a full move-in cost estimate on every listing — annual rent, agency fee, service charge, legal fee, caution fee, and total — so you can budget accurately before committing to an inspection.' },
    ],
  },
  {
    slug: 'student-housing-guide-uniport',
    title: 'Student Housing Guide For UNIPORT: Where To Live, What To Pay',
    excerpt: 'Planning to study at University of Port Harcourt? This guide covers the best off-campus areas, realistic costs, and what to avoid.',
    category: 'Relocation Guide',
    readTime: 10,
    publishedAt: '2025-03-30',
    tags: ['UNIPORT', 'student housing', 'Choba', 'hostel', 'Port Harcourt'],
    content: [
      { type: 'paragraph', text: 'University of Port Harcourt (UNIPORT) is one of Nigeria\'s largest universities, with over 50,000 students. The demand for off-campus housing far exceeds supply, which is why many students end up in overpriced or poorly maintained rooms. This guide gives you the intelligence to make better decisions.' },
      { type: 'heading', text: 'Popular Off-Campus Areas' },
      { type: 'paragraph', text: 'Choba is the primary off-campus area, located immediately adjacent to the main UNIPORT gate. Most students within a ₦40,000 – ₦120,000 budget live here. The area ranges from basic room-only setups to self-contained apartments in private estates.' },
      {
        type: 'list',
        items: [
          'Choba Main — closest to campus, highest density, more noise, cheaper rents',
          'Choba Estate — quieter, gated, slightly more expensive but better infrastructure',
          'Rumuekini — further from gate but quieter and cheaper; suitable if you have transportation',
          'Rumuosi — mid-range option with decent road access',
        ],
      },
      { type: 'heading', text: 'What You Should Expect To Pay (2025)' },
      {
        type: 'list',
        items: [
          'Room-only (shared toilet/bathroom): ₦50,000 – ₦90,000/year',
          'Room and parlour: ₦80,000 – ₦150,000/year',
          'Self-contained (1 bed): ₦120,000 – ₦250,000/year',
          'Hostel (per person in shared room): ₦40,000 – ₦80,000/year',
        ],
      },
      { type: 'heading', text: 'Key Things To Check As A Student Renter' },
      {
        type: 'list',
        items: [
          'Security — Is the compound gated? Is there a security guard at night?',
          'Electricity — Generators are common in Choba. Confirm generator hours and fuel sharing arrangements.',
          'Water — Many properties rely on boreholes. Ask who manages it and whether there have been shortages.',
          'Gender restrictions — Some hostels and compounds are gender-specific.',
          'Internet — Check network availability. MTN and Airtel tend to have stronger coverage in Choba.',
        ],
      },
      { type: 'callout', variant: 'tip', text: 'Use Veriq Property\'s Hostel Intelligence reports to compare hostels by gender policy, persons per room, meals included, and campus proximity — before paying a single inspection fee.' },
    ],
  },
  {
    slug: 'short-stay-vs-apartment-nigeria',
    title: 'Short Stay vs. Long-Term Apartment: Which Is Right For You?',
    excerpt: 'Relocating temporarily? Working a contract role? Here\'s how to decide between short stay and a full apartment rental in Nigeria.',
    category: 'Short Stay',
    readTime: 5,
    publishedAt: '2025-05-25',
    tags: ['short stay', 'Airbnb', 'apartment rental', 'Nigeria', 'comparison'],
    content: [
      { type: 'paragraph', text: 'More Nigerians than ever are choosing short stay accommodation for relocations, NYSC postings, business travel, and contract work. But the decision between short stay and a traditional apartment rental is not always obvious. Here\'s how to think through it.' },
      { type: 'heading', text: 'Choose Short Stay If:' },
      {
        type: 'list',
        items: [
          'Your stay is less than 3 months — the flexibility is worth the premium daily rate',
          'You need fully furnished accommodation with utilities already set up',
          'You\'re on a company expense account or business trip',
          'You want to test an area before committing to a long-term rental',
          'You\'re on NYSC posting and unsure how long you\'ll be stationed there',
        ],
      },
      { type: 'heading', text: 'Choose A Long-Term Apartment If:' },
      {
        type: 'list',
        items: [
          'Your stay exceeds 3 months — the math strongly favours annual rental beyond this point',
          'You want to personalise your space with your own furniture and items',
          'You\'re settling permanently in a city and want stable housing',
          'You need more space than short stay units typically offer',
          'You want to build a relationship with a landlord and neighbourhood',
        ],
      },
      { type: 'heading', text: 'The Cost Reality' },
      { type: 'paragraph', text: 'A decent short stay apartment in Port Harcourt costs ₦15,000 – ₦40,000 per night depending on location and amenities. That\'s ₦450,000 – ₦1,200,000 per month. A comparable self-contained apartment on an annual basis costs ₦250,000 – ₦600,000 for the entire year. Short stay is almost always more expensive monthly — but the value lies in flexibility, furnishing, and zero commitment.' },
      { type: 'callout', variant: 'info', text: 'Veriq Property\'s Short Stay Intelligence reports include verified data on AC quality, internet reliability, cleanliness standards, furnishing level, and kitchen access — so you know exactly what you\'re paying for.' },
    ],
  },
  {
    slug: 'agent-fees-what-to-negotiate',
    title: 'Agent Fees In Nigeria: What\'s Negotiable And What Isn\'t',
    excerpt: 'Most renters pay full agency fees without question. But some components are negotiable — and knowing which ones can save you thousands.',
    category: 'Landlord & Tenant',
    readTime: 5,
    publishedAt: '2025-04-05',
    tags: ['agency fee', 'negotiation', 'renting', 'Nigeria', 'landlord'],
    content: [
      { type: 'paragraph', text: 'Nigeria\'s property agency fee structure is often presented as fixed and non-negotiable. In reality, several elements can be discussed depending on the market, your relationship with the agent, and how motivated both parties are to close the deal.' },
      { type: 'heading', text: 'What Is Rarely Negotiable' },
      {
        type: 'list',
        items: [
          'Annual rent — set by the landlord and highly dependent on market demand',
          'Legal/agreement fee — lawyers set their own rates',
          'Service charge — set by estate management',
        ],
      },
      { type: 'heading', text: 'What Is Often Negotiable' },
      {
        type: 'list',
        items: [
          'Agency fee — especially on properties that have been vacant for a while. Agents may accept 5% instead of 10%.',
          'Caution deposit — some landlords will waive or reduce this for trusted tenants with references.',
          'Inspection fee — should always be waived or offset if you proceed with the rental.',
          'Timing of rent payment — some landlords will accept 6+6 months instead of a full year upfront.',
        ],
      },
      { type: 'callout', variant: 'tip', text: 'The best time to negotiate is before you show strong interest. Once an agent knows you\'re committed, leverage decreases significantly. Do your negotiating early.' },
      { type: 'paragraph', text: 'Remember: everything you negotiate should be documented in writing. Verbal agreements in Nigeria\'s property market are worth very little if disputes arise later.' },
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getPostsByCategory(category: BlogCategory): BlogPost[] {
  return BLOG_POSTS.filter((p) => p.category === category);
}

export const ALL_CATEGORIES: BlogCategory[] = [
  'Property Intelligence',
  'Renting Tips',
  'Inspection Tips',
  'Location Reviews',
  'Scam Awareness',
  'Housing Trends',
  'Landlord & Tenant',
  'Relocation Guide',
  'Short Stay',
];

export const CATEGORY_COLORS: Record<BlogCategory, string> = {
  'Property Intelligence': 'bg-blue-100 text-blue-700',
  'Renting Tips': 'bg-emerald-100 text-emerald-700',
  'Inspection Tips': 'bg-amber-100 text-amber-700',
  'Location Reviews': 'bg-purple-100 text-purple-700',
  'Scam Awareness': 'bg-red-100 text-red-700',
  'Housing Trends': 'bg-indigo-100 text-indigo-700',
  'Landlord & Tenant': 'bg-slate-100 text-slate-700',
  'Relocation Guide': 'bg-teal-100 text-teal-700',
  'Short Stay': 'bg-orange-100 text-orange-700',
};
