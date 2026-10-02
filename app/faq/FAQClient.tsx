'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FAQItem } from './faq-data';

/**
 * The prototype's `#faq` body: a search field at 650px, then the nine questions as an accordion.
 *
 * `<details>` would be keyboard operable for free, but it cannot announce state on a filtered list the
 * way a screen reader user needs, so each row is a real button with `aria-expanded`/`aria-controls`
 * inside a heading — which keeps the page outline readable: h1 → question → answer.
 */
export function FAQClient({ faqs }: { faqs: FAQItem[] }) {
  const baseId = useId();
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const query = search.trim().toLowerCase();
  const filtered = faqs.filter(
    (faq) => !query || faq.q.toLowerCase().includes(query) || faq.a.toLowerCase().includes(query),
  );

  return (
    <div className="max-w-[790px]">
      <label htmlFor={`${baseId}-search`} className="sr-only">
        Search FAQs
      </label>
      <input
        id={`${baseId}-search`}
        type="search"
        className="input mb-[30px] max-w-[650px]"
        placeholder="Search a question…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {filtered.length === 0 ? (
        <p className="rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px] text-muted-foreground">
          No question matches that yet. Try another word.
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
                {/* A heading for the page outline only — the prototype's trigger is body-sized. */}
                <h2 className="font-sans text-base font-normal leading-normal tracking-normal">
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenQuestion(isOpen ? null : faq.q)}
                    className="flex w-full items-start justify-between gap-4 rounded-unit p-[17px] text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {faq.q}
                    <ChevronDown
                      aria-hidden="true"
                      className={`mt-1 h-4 w-4 flex-none transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-primary' : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                </h2>
                <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen}>
                  <p className="whitespace-pre-line px-[17px] pb-[17px] leading-[1.6] text-muted-foreground">
                    {faq.a}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
