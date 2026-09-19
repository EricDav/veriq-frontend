'use client';

import React, { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import type { FieldDef, FieldGroup, FormSchema, SchemaAnswers, SchemaIssue } from '@/types/agent';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useFormSchema } from './AnswersView';
import { ErrorBlock, LoadingBlock } from './ui';
import { GROUP_LABELS, groupLayout, isRequired, isVisible, readValue, writeValue } from './schema-utils';

function FieldInput({
  field,
  value,
  onChange,
  disabled,
  id,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  id: string;
}) {
  if (field.fixed !== undefined) {
    return <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Fixed at {String(field.fixed)} for this subtype</p>;
  }
  switch (field.type) {
    case 'select':
    case 'condition':
    case 'presence':
    case 'ordinal':
      return (
        <select
          id={id}
          className="input !py-2"
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case 'multiselect':
    case 'defects': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (optionValue: string) => {
        let next = selected.includes(optionValue) ? selected.filter((item) => item !== optionValue) : [...selected, optionValue];
        if (field.type === 'defects') {
          if (optionValue === 'none_observed' && next.includes('none_observed')) next = ['none_observed'];
          else next = next.filter((item) => item !== 'none_observed' || optionValue === 'none_observed');
        }
        onChange(next.length ? next : null);
      };
      return (
        <div className="flex flex-wrap gap-1.5" id={id}>
          {(field.options ?? []).map((option) => {
            const active = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => toggle(option.value)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-60',
                  active ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-navy-400',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }
    case 'integer':
    case 'money':
      return (
        <input
          id={id}
          type="number"
          inputMode="numeric"
          step={1}
          min={field.type === 'money' ? 0 : field.min}
          max={field.max}
          className="input !py-2"
          disabled={disabled}
          value={typeof value === 'number' || typeof value === 'string' ? String(value) : ''}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === '') return onChange(null);
            const parsed = Number(raw);
            onChange(Number.isFinite(parsed) ? Math.trunc(parsed) : null);
          }}
        />
      );
    case 'observation':
      return (
        <textarea
          id={id}
          rows={3}
          className="input resize-y !py-2"
          disabled={disabled}
          maxLength={field.max ?? 2000}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        />
      );
    case 'url':
      return (
        <input
          id={id}
          type="url"
          className="input !py-2"
          disabled={disabled}
          placeholder="https://"
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        />
      );
    case 'text':
    default:
      return (
        <input
          id={id}
          className="input !py-2"
          disabled={disabled}
          maxLength={field.max ?? 2000}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        />
      );
  }
}

/** Controlled schema-driven fields for the selected groups; required values start blank with no Unknown option. */
export function AnswersFields({
  schema,
  value,
  onChange,
  groups,
  issues = [],
  disabled,
  excludeKeys = [],
}: {
  schema: FormSchema;
  value: SchemaAnswers;
  onChange: (next: SchemaAnswers) => void;
  groups: FieldGroup[];
  issues?: SchemaIssue[];
  disabled?: boolean;
  excludeKeys?: string[];
}) {
  const issueFor = (path: string) => issues.find((issue) => issue.path === path || issue.path.endsWith(`.${path}`))?.message;

  const renderField = (field: FieldDef, componentKey: string | null, groupName: FieldGroup) => {
    if (!isVisible(field, value, componentKey) || excludeKeys.includes(field.key)) return null;
    const path = componentKey ? `${groupName}.components.${componentKey}.${field.key}` : `${groupName}.${field.key}`;
    const id = `answer-${schema.id}-${path}`.replace(/[^a-zA-Z0-9_-]/g, '-');
    const issue = issueFor(path);
    const wide = field.type === 'observation' || field.type === 'multiselect' || field.type === 'defects';
    return (
      <div key={path} className={cn(wide && 'sm:col-span-2')}>
        <label htmlFor={id} className="label !mb-1 !text-xs">
          {field.label}
          {isRequired(field, value, componentKey) && field.fixed === undefined && <span className="text-red-500"> *</span>}
        </label>
        <FieldInput
          id={id}
          field={field}
          disabled={disabled}
          value={readValue(value, field, componentKey)}
          onChange={(next) => onChange(writeValue(value, field, componentKey, next))}
        />
        {field.help && <p className="mt-1 text-[11px] text-slate-400">{field.help}</p>}
        {issue && <p className="mt-1 text-[11px] text-red-600">{issue}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {groups.map((groupName) => {
        const { topLevel, perComponent } = groupLayout(schema, value, groupName);
        const visible = topLevel.filter((field) => !excludeKeys.includes(field.key));
        if (visible.length === 0 && perComponent.length === 0) return null;
        return (
          <fieldset key={groupName} className="space-y-3">
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{GROUP_LABELS[groupName]}</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{visible.map((field) => renderField(field, null, groupName))}</div>
            {perComponent.map(({ instance, fields }) => (
              <div key={`${groupName}-${instance.key}`} className="rounded-xl border border-slate-100 p-3">
                <p className="mb-2 text-xs font-semibold text-navy-800">{instance.label}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{fields.map((field) => renderField(field, instance.key, groupName))}</div>
              </div>
            ))}
          </fieldset>
        );
      })}
    </div>
  );
}

/** Loads a schema and edits answers with a save action; server schema issues are shown against their fields. */
export function AnswersEditor({
  schemaId,
  initial,
  groups,
  onSave,
  saveLabel = 'Save corrections',
  disabled,
  excludeKeys,
}: {
  schemaId: string;
  initial: SchemaAnswers;
  groups: FieldGroup[];
  onSave: (answers: SchemaAnswers) => Promise<SchemaIssue[] | null>;
  saveLabel?: string;
  disabled?: boolean;
  excludeKeys?: string[];
}) {
  const { schema, error, retry } = useFormSchema(schemaId);
  const initialSnapshot = useMemo(() => JSON.stringify(initial), [initial]);
  const [value, setValue] = useState<SchemaAnswers>(initial);
  const [issues, setIssues] = useState<SchemaIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(value) !== initialSnapshot;

  if (error) return <ErrorBlock message={error} onRetry={retry} />;
  if (!schema) return <LoadingBlock label="Loading schema…" />;

  const save = async () => {
    setSaving(true);
    const payload: SchemaAnswers = {};
    groups.forEach((group) => {
      payload[group] = value[group] ?? {};
    });
    const result = await onSave(payload);
    setIssues(result ?? []);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <AnswersFields schema={schema} value={value} onChange={setValue} groups={groups} issues={issues} disabled={disabled || saving} excludeKeys={excludeKeys} />
      {issues.length > 0 && (
        <ErrorBlock message={`${issues.length} field${issues.length === 1 ? '' : 's'} need attention: ${issues[0].message}`} />
      )}
      {!disabled && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {dirty && (
            <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => { setValue(initial); setIssues([]); }} disabled={saving}>
              Discard changes
            </button>
          )}
          <button type="button" onClick={save} disabled={saving || !dirty} className="btn-primary !px-4 !py-2 text-sm">
            {saving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />} {saveLabel}
          </button>
        </div>
      )}
    </div>
  );
}
