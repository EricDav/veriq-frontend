'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { FieldGroup, FormSchema, SchemaAnswers, SchemaIssue } from '@/types/operator';
import { SchemaForm } from './SchemaForm';
import { OPERATOR_HIDDEN_FIELDS, schemaHasGroup } from './schema-engine';

const TAB_LABELS: Record<FieldGroup, string> = {
  facts: 'Facts',
  commercial: 'Commercial terms',
  intelligence: 'Intelligence',
};

export interface SchemaTabsProps {
  schema: FormSchema;
  groups: FieldGroup[];
  value: SchemaAnswers;
  onChange?: (next: SchemaAnswers) => void;
  issues?: SchemaIssue[];
  /** Groups shown read-only (e.g. verified facts/intelligence that change only through a revision). */
  readOnlyGroups?: FieldGroup[];
  notes?: Partial<Record<FieldGroup, ReactNode>>;
  idPrefix: string;
}

/** Tabbed Facts / Commercial / Intelligence sections for one schema, with per-tab issue counts. */
export function SchemaTabs({ schema, groups, value, onChange, issues = [], readOnlyGroups = [], notes, idPrefix }: SchemaTabsProps) {
  const available = groups.filter((group) => schemaHasGroup(schema, group, OPERATOR_HIDDEN_FIELDS));
  const [active, setActive] = useState<FieldGroup>(available[0] ?? 'facts');
  const current = available.includes(active) ? active : available[0];
  if (!current) return <p className="text-ui-md text-muted-foreground">This form has no questions for you to answer.</p>;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Listing sections"
        className="flex flex-wrap gap-1.5 rounded-review border border-[#ffffff18] bg-card p-1.5"
      >
        {available.map((group) => {
          const count = issues.filter((issue) => issue.path.startsWith(`${group}.`)).length;
          return (
            <button
              key={group}
              type="button"
              role="tab"
              aria-selected={current === group}
              onClick={() => setActive(group)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-btn px-3 py-2.5 text-ui-sm font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                current === group ? 'bg-[#10b9811a] text-[#6ee7b7]' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {TAB_LABELS[group]}
              {count > 0 && (
                <span className="rounded-full bg-[#fb718520] px-1.5 text-[10px] font-semibold text-[#fda4af]">
                  {count}
                  <span className="sr-only"> issues</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      {notes?.[current]}
      <SchemaForm
        schema={schema}
        groups={[current]}
        value={value}
        onChange={onChange}
        issues={issues}
        readOnly={readOnlyGroups.includes(current) || !onChange}
        idPrefix={`${idPrefix}-${current}`}
      />
    </div>
  );
}
