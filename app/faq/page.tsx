"use client";

import { useState } from "react";
import { ChevronDown, Shield, Search } from "lucide-react";

const FAQS = [
  { q: "What is Veriq Property?", a: "Veriq Property is a property intelligence platform designed to help people make smarter property decisions before physical inspections. We provide verified listings, detailed property intelligence reports, and agent trust scores." },
  { q: "Does Veriq Property own the listed properties?", a: "No. Veriq Property does not own properties listed on the platform. The platform operates as a property intelligence and intermediary service. All listings are submitted by independent agents." },
  { q: "Does Veriq Property guarantee properties?", a: "No. Users are strongly advised to physically inspect properties and independently verify important details before making commitments. We provide intelligence to help you decide — not a guarantee." },
  { q: "Why do I need to pay before seeing full property details?", a: "The consultation/intelligence access fee unlocks detailed property intelligence, structured disclosures, and consultation access. This model ensures agents take listings seriously and users receive quality, curated information." },
  { q: "What is included after unlocking a property?", a: "Users may access detailed property images, environmental information, accessibility reports, utility disclosures, and consultation messaging with the listing agent." },
  { q: "What happens if the property is no longer available after payment?", a: "If a property becomes unavailable shortly after consultation unlock, users may qualify for a refund credit. This can be applied toward unlocking similar available properties." },
  { q: "Will I always receive a cash refund?", a: "Not necessarily. Refunds may be issued as wallet credit, platform credit, or similar-property access support rather than direct cash refunds." },
  { q: "What qualifies for refund consideration?", a: "Refund consideration may apply to unavailable properties, stale listings, duplicate listings, fake listings, or major listing misrepresentation." },
  { q: "What does NOT qualify for refunds?", a: "Refunds are generally not granted for change of mind, personal preference, or dissatisfaction after inspection. The property must have been genuinely misrepresented or unavailable." },
  { q: "How are agents verified?", a: "Agents may go through identity verification, listing review, profile assessment, and platform moderation before receiving verified status." },
  { q: "What are trust scores?", a: "Trust scores measure agent performance based on listing accuracy, response speed, freshness reliability, and inspection success rate. Higher trust scores earn agents better visibility on the platform." },
  { q: "Can agents lose visibility or get suspended?", a: "Yes. Agents who repeatedly violate platform policies may face reduced visibility, suspension, payout restrictions, or permanent removal from the platform." },
  { q: "Can multiple agents post the same property?", a: "Yes. Users can compare agents based on trust scores and platform performance when multiple agents list the same property." },
  { q: "Does Veriq Property handle rent payments?", a: "No. Veriq Property currently focuses on property intelligence and consultation access. Rent payment arrangements are made directly between tenants and landlords/agents." },
  { q: "Is Veriq Property available only in Port Harcourt?", a: "The platform may begin with focused operational regions but is designed for broader expansion over time across Nigeria and beyond." },
  { q: "Why do listings expire automatically?", a: "Automatic expiration helps reduce stale listings and outdated property information. Agents must regularly reconfirm listing availability to keep properties active." },
  { q: "How does Veriq Property reduce fake listings?", a: "The platform uses moderation, trust systems, freshness requirements, refund protection, and performance tracking to discourage and identify fake listings." },
  { q: "Can agents withdraw earnings immediately?", a: "No. Agent earnings may first enter a temporary Pending Balance review period of up to 48 hours before becoming available for withdrawal." },
  { q: "What is the minimum withdrawal amount for agents?", a: "The current minimum withdrawal threshold is ₦5,000. Withdrawals can be made once daily." },
  { q: "How can I contact Veriq Property?", a: "Users can contact Veriq Property through official support channels and platform communication systems. Visit our Contact page for details." },
];

const CATEGORIES = [
  { label: "All", value: "all" },
  { label: "For Renters", value: "renter", indices: [0,1,2,3,4,5,6,7,8,12,13,14,15,16,19] },
  { label: "For Agents", value: "agent", indices: [9,10,11,12,13,16,17,18,19] },
  { label: "Payments & Refunds", value: "payment", indices: [3,5,6,7,8,17,18] },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = FAQS.filter((faq) => {
    const matchSearch =
      !search ||
      faq.q.toLowerCase().includes(search.toLowerCase()) ||
      faq.a.toLowerCase().includes(search.toLowerCase());
    const cat = CATEGORIES.find((c) => c.value === activeCategory);
    const matchCat = activeCategory === "all" || (cat?.indices && cat.indices.includes(FAQS.indexOf(faq)));
    return matchSearch && matchCat;
  });

  return (
    <>
      {/* Hero */}
      <section className="bg-hero-pattern pt-32 pb-20 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 80L1440 80L1440 40C1200 0 800 0 720 40C640 80 240 80 0 40L0 80Z" fill="white" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold text-gold-300 mb-5">
            <Shield className="h-3.5 w-3.5" />
            Frequently Asked Questions
          </div>
          <h1 className="font-display text-5xl font-bold text-white mb-4">FAQ</h1>
          <p className="text-white/70 text-lg">
            Everything you need to know about Veriq Property — for renters, property seekers, and agents.
          </p>
        </div>
      </section>

      {/* FAQ content */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              className="input pl-11"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  activeCategory === cat.value
                    ? "bg-veriq-secondary text-white"
                    : "bg-slate-100 text-navy-700 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQ items */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-veriq-muted">
                No results found for &ldquo;{search}&rdquo;
              </div>
            ) : (
              filtered.map((faq, i) => {
                const globalIndex = FAQS.indexOf(faq);
                const isOpen = openIndex === globalIndex;
                return (
                  <div
                    key={globalIndex}
                    className={`rounded-2xl border transition-all duration-200 ${
                      isOpen ? "border-veriq-secondary/30 bg-blue-50/50" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <button
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                      onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                    >
                      <span className="font-semibold text-navy-900 text-sm leading-snug">{faq.q}</span>
                      <ChevronDown
                        className={`h-5 w-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-veriq-secondary" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5">
                        <p className="text-sm text-veriq-muted leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 rounded-2xl bg-veriq-surface p-8 text-center">
            <h3 className="font-display text-lg font-bold text-navy-900 mb-2">Still have questions?</h3>
            <p className="text-sm text-veriq-muted mb-5">
              Our support team is happy to help with any inquiry not covered above.
            </p>
            <a href="/contact" className="btn-primary">
              Contact Support
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
