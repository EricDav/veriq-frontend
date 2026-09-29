'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search } from 'lucide-react';
import { Button, Panel } from '@/components/ui';
import type { FAQCategory, FAQItem } from './faq-data';

/**
 * The prototype's FAQ is a stack of `.unit` rows — `#070b1444` on a `#ffffff18` hairline, 10px radius,
 * 17px padding — and nothing else. The search field and the category bar are ours: this page carries
 * far more questions than the prototype's nine, so it keeps the two controls that make that readable,
 * in the prototype's own `.categorybar` grammar.
 *
 * `<details>` would be keyboard operable for free, but it cannot announce state on a filtered list the
 * way a screen reader user needs, so each row is a real button with `aria-expanded`/`aria-controls`
 * inside a heading — which keeps the page outline readable: h1 → question → answer.
 */
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
  const baseId = useId();
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const query = search.trim().toLowerCase();
  const filtered = faqs.filter((faq) => {
    const matchesSearch =
      !query || faq.q.toLowerCase().includes(query) || faq.a.toLowerCase().includes(query);
    const matchesCategory = activeCategory === 'all' || faq.categories?.includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="mt-8 max-w-[790px]">
      <div className="relative max-w-[650px]">
        <label htmlFor={`${baseId}-search`} className="sr-only">
          Search the questions
        </label>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id={`${baseId}-search`}
          type="search"
          className="input pl-11"
          placeholder="Search a question…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter questions by topic">
        {categories.map((category) => {
          const isActive = activeCategory === category.value;
          return (
            <button
              key={category.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveCategory(category.value)}
              className={`rounded-btn border px-3 py-2 text-ui-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                isActive
                  ? 'border-primary bg-[#10b98112] text-[#6ee7b7]'
                  : 'border-[#ffffff18] bg-[#ffffff06] text-muted-foreground hover:text-foreground'
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      <div className="mt-7">
        {filtered.length === 0 ? (
          <p className="rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px] text-[0.95rem] text-muted-foreground">
            No question matches that yet. Try another word, or{' '}
            <Link href="/contact" className="font-semibold text-primary hover:underline">
              ask us directly
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((faq) => {
              const isOpen = openQuestion === faq.q;
              const panelId = `${baseId}-panel-${faq.q.replace(/\W+/g, '-').toLowerCase()}`;
              const buttonId = `${panelId}-button`;
              return (
                <li
                  key={faq.q}
                  className={`rounded-unit border bg-[#070b1444] transition-colors ${
                    isOpen ? 'border-[#10b98170]' : 'border-[#ffffff18]'
                  }`}
                >
                  <h2>
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenQuestion(isOpen ? null : faq.q)}
                      className="flex w-full items-start justify-between gap-4 rounded-unit p-[17px] text-left text-[0.95rem] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {faq.q}
                      <ChevronDown
                        aria-hidden="true"
                        className={`mt-0.5 h-4 w-4 flex-none transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-primary' : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  </h2>
                  <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen}>
                    <p className="whitespace-pre-line px-[17px] pb-[17px] text-[0.95rem] leading-[1.6] text-muted-foreground">
                      {faq.a}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Panel as="section" aria-labelledby={`${baseId}-cta`} className="mt-10">
        <h2
          id={`${baseId}-cta`}
          className="font-display text-[1.12rem] font-semibold leading-[1.3] tracking-[-0.035em] text-foreground"
        >
          {ctaTitle}
        </h2>
        <p className="mt-3 text-[0.95rem] leading-[1.6] text-muted-foreground">{ctaBody}</p>
        <Button asChild variant="secondary" className="mt-5">
          <Link href="/contact">Get help</Link>
        </Button>
      </Panel>
    </div>
  );
}
