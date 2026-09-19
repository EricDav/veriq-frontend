'use client';

import React, { useEffect, useState } from 'react';
import type { FieldGroup, FormSchema, SchemaAnswers, SchemaIssue } from '@/types/agent';
import { schemasApi } from '@/lib/api/agent';
import { errorMessage } from './format';
import { ErrorBlock, LoadingBlock } from './ui';
import { GROUP_LABELS, formatAnswer, groupLayout, isVisible, readValue } from './schema-utils';

export function useFormSchema(schemaId: string | null | undefined) {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (!schemaId) {
      setSchema(null);
      return;
    }
    setError('');
    schemasApi
      .get(schemaId)
      .then((result) => {
        if (active) setSchema(result);
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err, 'Could not load the form schema'));
      });
    return () => {
      active = false;
    };
  }, [schemaId, attempt]);

  return { schema, error, retry: () => setAttempt((value) => value + 1) };
}

/** Read-only presentation of schema answers grouped as Facts / Commercial / Intelligence (Appendix F). */
export function AnswersView({
  schemaId,
  answers,
  groups = ['facts', 'commercial', 'intelligence'],
  issues = [],
}: {
  schemaId: string;
  answers: SchemaAnswers;
  groups?: FieldGroup[];
  issues?: SchemaIssue[];
}) {
  const { schema, error, retry } = useFormSchema(schemaId);
  if (error) return <ErrorBlock message={error} onRetry={retry} />;
  if (!schema) return <LoadingBlock label="Loading schema…" />;

  const issuePaths = new Set(issues.map((issue) => issue.path));

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const { topLevel, perComponent } = groupLayout(schema, answers, group);
        const visibleTop = topLevel.filter((field) => isVisible(field, answers, null));
        if (visibleTop.length === 0 && perComponent.length === 0) return null;
        return (
          <div key={group}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{GROUP_LABELS[group]}</p>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              {visibleTop.map((field) => {
                const path = `${group}.${field.key}`;
                return (
                  <div key={path} className={issuePaths.has(path) ? 'rounded-lg bg-amber-50 px-2 py-1' : 'px-2 py-1'}>
                    <dt className="text-[11px] text-slate-500">{field.label}</dt>
                    <dd className="break-words text-sm font-medium text-navy-900">{formatAnswer(field, readValue(answers, field, null))}</dd>
                  </div>
                );
              })}
            </dl>
            {perComponent.map(({ instance, fields }) => (
              <div key={`${group}-${instance.key}`} className="mt-3 rounded-lg border border-slate-100 p-2">
                <p className="mb-1 px-2 text-xs font-semibold text-navy-800">{instance.label}</p>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                  {fields
                    .filter((field) => isVisible(field, answers, instance.key))
                    .map((field) => {
                      const path = `${group}.components.${instance.key}.${field.key}`;
                      return (
                        <div key={path} className={issuePaths.has(path) ? 'rounded-lg bg-amber-50 px-2 py-1' : 'px-2 py-1'}>
                          <dt className="text-[11px] text-slate-500">{field.label}</dt>
                          <dd className="break-words text-sm font-medium text-navy-900">
                            {formatAnswer(field, readValue(answers, field, instance.key))}
                          </dd>
                        </div>
                      );
                    })}
                </dl>
              </div>
            ))}
          </div>
        );
      })}
      {issues.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="mb-1 text-xs font-bold text-amber-800">Incomplete for publication</p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-800">
            {issues.map((issue) => (
              <li key={issue.path}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
