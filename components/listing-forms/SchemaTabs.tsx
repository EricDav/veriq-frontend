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
  if (!current) return <p className="text-sm text-slate-500">This form has no questions for you to answer.</p>;

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
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
                'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                current === group ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900',
              )}
            >
              {TAB_LABELS[group]}
              {count > 0 && <span className="rounded-full bg-red-100 px-1.5 text-[10px] font-bold text-red-700">{count}</span>}
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
