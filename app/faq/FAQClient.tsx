'use client';

import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

type FAQItem = { q: string; a: string; categories?: string[] };
type FAQCategory = { label: string; value: string };

export function FAQClient({
  faqs,
  categories,
  ctaTitle,
  ctaBody,
}: {
  faqs: FAQItem[];
  categories: FAQCategory[];
  ctaTitle: string;
  ctaBody: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = faqs.filter((faq) => {
    const matchSearch =
      !search ||
      faq.q.toLowerCase().includes(search.toLowerCase()) ||
      faq.a.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || faq.categories?.includes(activeCategory);
    return matchSearch && matchCat;
  });

  return (
    <section className="py-20 bg-card">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            className="input pl-11"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                activeCategory === cat.value
                  ? 'bg-primary text-foreground'
                  : 'bg-[#ffffff08] text-foreground hover:bg-[#ffffff08]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No results found for &ldquo;{search}&rdquo;
            </div>
          ) : (
            filtered.map((faq) => {
              const globalIndex = faqs.indexOf(faq);
              const isOpen = openIndex === globalIndex;
              return (
                <div
                  key={`${faq.q}-${globalIndex}`}
                  className={`rounded-2xl border transition-all duration-200 ${
                    isOpen ? 'border-[#10b98135] bg-[#ffffff08]' : 'border-[#ffffff12] bg-card hover:border-[#ffffff12]'
                  }`}
                >
                  <button
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                    onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                  >
                    <span className="font-semibold text-foreground text-sm leading-snug">{faq.q}</span>
                    <ChevronDown className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5">
                      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-12 rounded-2xl bg-background p-8 text-center">
          <h3 className="font-display text-lg font-bold text-foreground mb-2">{ctaTitle}</h3>
          <p className="text-sm text-muted-foreground mb-5">{ctaBody}</p>
          <a href="/contact" className="btn-primary">
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}
