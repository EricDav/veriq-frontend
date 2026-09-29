'use client';

import { useMemo } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ComponentInstance,
  FieldDef,
  FieldGroup,
  FormSchema,
  SchemaAnswers,
  SchemaIssue,
} from '@/types/operator';
import {
  OPERATOR_HIDDEN_FIELDS,
  componentInstances,
  displayAnswer,
  fieldPath,
  isEmptyValue,
  isFieldRequired,
  isFieldVisible,
  readAnswer,
  writeAnswer,
} from './schema-engine';
import { IssueList } from './ui';

const DEFAULT_GROUP_TITLES: Record<FieldGroup, string> = {
  facts: 'Facts',
  commercial: 'Commercial terms',
  intelligence: 'Structured intelligence',
};

const DEFAULT_GROUP_DESCRIPTIONS: Record<FieldGroup, string> = {
  facts: 'Factual details your Veriq Agent will confirm during verification.',
  commercial: 'Price and permitted charges. Agency and inspection fees are not supported on Veriq.',
  intelligence:
    'Your honest assessment of condition and defects. Your Veriq Agent verifies every answer before publication.',
};

export interface SchemaFormProps {
  schema: FormSchema;
  groups: FieldGroup[];
  value: SchemaAnswers;
  onChange?: (next: SchemaAnswers) => void;
  /** Issues with paths relative to this schema, e.g. `facts.bedrooms` or `intelligence.components.bedroom_1.bedroom_condition`. */
  issues?: SchemaIssue[];
  readOnly?: boolean;
  hiddenFields?: string[];
  groupTitles?: Partial<Record<FieldGroup, string>>;
  groupDescriptions?: Partial<Record<FieldGroup, string | null>>;
  idPrefix: string;
  className?: string;
}

/** Renders a subtype schema group with required/requiredWhen/visibleWhen/fixed rules and repeatable components (§31.4–31.5). */
export function SchemaForm({
  schema,
  groups,
  value,
  onChange,
  issues = [],
  readOnly = false,
  hiddenFields = OPERATOR_HIDDEN_FIELDS,
  groupTitles,
  groupDescriptions,
  idPrefix,
  className,
}: SchemaFormProps) {
  const instances = useMemo(() => componentInstances(schema, value), [schema, value]);
  const issueByPath = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const issue of issues) map.set(issue.path, [...(map.get(issue.path) ?? []), issue.message]);
    return map;
  }, [issues]);

  const renderedPaths = new Set<string>();
  const editable = !readOnly && !!onChange;

  const requiredByDescription = (field: FieldDef) =>
    schema.fields.some(
      (candidate) =>
        candidate.descriptionField === field.key && Number(readAnswer(value, candidate, null)) > 0,
    );

  const renderField = (field: FieldDef, instance: ComponentInstance | null) => {
    const componentKey = instance?.key ?? null;
    if (!isFieldVisible(field, value, componentKey)) return null;
    const path = fieldPath(field, componentKey);
    renderedPaths.add(path);
    const fieldIssues = issueByPath.get(path) ?? [];
    const required = isFieldRequired(field, value, componentKey) || requiredByDescription(field);
    const current = readAnswer(value, field, componentKey);
    const inputId = `${idPrefix}-${path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const wide = ['text', 'observation', 'multiselect', 'defects'].includes(field.type);
    const set = (next: unknown) => onChange?.(writeAnswer(value, field, componentKey, next));

    return (
      <div key={path} className={cn('min-w-0', wide && 'sm:col-span-2')}>
        <label htmlFor={inputId} className="label">
          {field.label}
          {field.fixed === undefined &&
            (required ? (
              <span className="ml-1 text-destructive" aria-label="required">*</span>
            ) : (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">Optional</span>
            ))}
        </label>
        {field.fixed !== undefined ? (
          <p className="flex items-center gap-2 rounded-unit border border-dashed border-[#ffffff25] bg-[#070b1444] px-4 py-3 text-ui-md text-muted-foreground">
            <Lock aria-hidden="true" className="h-3.5 w-3.5" /> Fixed at {String(field.fixed)} for {schema.label}
          </p>
        ) : !editable ? (
          <p className={cn('rounded-unit border border-[#ffffff18] bg-[#070b1444] px-4 py-3 text-ui-md', isEmptyValue(current) ? 'text-muted-foreground' : 'text-foreground')}>
            {displayAnswer(field, current)}
          </p>
        ) : (
          <FieldControl
            field={field}
            id={inputId}
            value={current}
            onChange={set}
            invalid={fieldIssues.length > 0}
            describedBy={
              [field.help ? `${inputId}-hint` : null, fieldIssues.length ? `${inputId}-error` : null]
                .filter(Boolean)
                .join(' ') || undefined
            }
          />
        )}
        {field.help && (
          <p id={`${inputId}-hint`} className="mt-1 text-xs text-muted-foreground">
            {field.help}
          </p>
        )}
        {fieldIssues.length > 0 && (
          <div id={`${inputId}-error`} role="alert">
            {fieldIssues.map((message) => (
              <p key={message} className="mt-1 text-xs font-medium text-destructive">
                {message}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  const sections = groups.map((group) => {
    const fields = schema.fields.filter((field) => field.group === group && !hiddenFields.includes(field.key));
    if (!fields.length) return null;
    const plain = fields.filter((field) => !field.component);
    const componentDefs = schema.components.filter((component) =>
      fields.some((field) => field.component === component.key),
    );
    const description = groupDescriptions?.[group] === undefined ? DEFAULT_GROUP_DESCRIPTIONS[group] : groupDescriptions[group];
    return (
      <fieldset key={group} className="space-y-4">
        {(groups.length > 1 || groupTitles?.[group]) && (
          <legend className="mb-2">
            <span className="font-display text-ui-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {groupTitles?.[group] ?? DEFAULT_GROUP_TITLES[group]}
            </span>
            {description && <span className="mt-1 block text-xs text-muted-foreground">{description}</span>}
          </legend>
        )}
        {groups.length === 1 && !groupTitles?.[group] && description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {plain.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">{plain.map((field) => renderField(field, null))}</div>
        )}
        {componentDefs.map((component) => {
          const own = instances.filter((instance) => instance.type === component.key);
          const componentFields = fields.filter((field) => field.component === component.key);
          if (!own.length) {
            const countField = component.countField
              ? schema.fields.find((field) => field.key === component.countField)
              : undefined;
            return (
              <p key={component.key} className="rounded-unit border border-dashed border-[#ffffff25] px-4 py-3 text-xs text-muted-foreground">
                {countField
                  ? `Enter "${countField.label}" to add a section for each ${component.label.toLowerCase()}.`
                  : `No ${component.label.toLowerCase()} sections apply to ${schema.label}.`}
              </p>
            );
          }
          return own.map((instance) => (
            <div key={`${group}-${instance.key}`} className="rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px]">
              <p className="mb-3 text-ui-md font-semibold text-foreground">{instance.label}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {componentFields.map((field) => renderField(field, instance))}
              </div>
            </div>
          ));
        })}
      </fieldset>
    );
  });

  const unmatched = issues.filter(
    (issue) => groups.some((group) => issue.path.startsWith(`${group}.`)) && !renderedPaths.has(issue.path),
  );

  return (
    <div className={cn('space-y-6', className)}>
      {sections}
      {unmatched.length > 0 && <IssueList title="Other answers need attention" issues={unmatched} />}
    </div>
  );
}

function FieldControl({
  field,
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  field: FieldDef;
  id: string;
  value: unknown;
  onChange: (value: unknown) => void;
  invalid: boolean;
  /** Ids of the help and error lines this control is annotated by, so a screen reader reads both. */
  describedBy?: string;
}) {
  const inputClass = cn('input', invalid && 'border-destructive focus:border-destructive focus:ring-[#fb718540]');
  /** Applied to every control in this switch, so help and errors are announced with the field. */
  const a11y = { 'aria-invalid': invalid || undefined, 'aria-describedby': describedBy };

  switch (field.type) {
    case 'select':
    case 'condition':
    case 'presence':
    case 'ordinal':
      return (
        <select id={id} {...a11y} className={inputClass} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)}>
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
      const toggle = (option: string) => {
        if (selected.includes(option)) return onChange(selected.filter((item) => item !== option));
        if (field.type === 'defects' && option === 'none_observed') return onChange(['none_observed']);
        return onChange([...selected.filter((item) => field.type !== 'defects' || item !== 'none_observed'), option]);
      };
      return (
        <div id={id} role="group" {...a11y} className={cn('flex flex-wrap gap-2 rounded-unit', invalid && 'ring-2 ring-[#fb718540]')}>
          {(field.options ?? []).map((option) => {
            const active = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(option.value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-[#ffffff18] bg-[#070b1444] text-muted-foreground hover:border-[#10b98170] hover:text-foreground',
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
        <div className="relative">
          {field.type === 'money' && (
            <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₦</span>
          )}
          <input
            id={id}
            {...a11y}
            type="number"
            inputMode="numeric"
            step={1}
            min={field.min}
            max={field.max}
            className={cn(inputClass, field.type === 'money' && 'pl-8')}
            value={typeof value === 'number' || typeof value === 'string' ? String(value) : ''}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === '') return onChange(undefined);
              const parsed = Number(raw);
              onChange(Number.isFinite(parsed) ? parsed : raw);
            }}
          />
        </div>
      );
    case 'observation':
      return (
        <textarea
          id={id}
          {...a11y}
          rows={3}
          maxLength={field.max ?? 2000}
          className={inputClass}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case 'url':
      return (
        <input
          id={id}
          {...a11y}
          type="url"
          inputMode="url"
          placeholder="https://"
          className={inputClass}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value.trim())}
        />
      );
    case 'text':
    default:
      return (field.max ?? 2000) > 300 ? (
        <textarea
          id={id}
          {...a11y}
          rows={3}
          maxLength={field.max ?? 2000}
          className={inputClass}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          {...a11y}
          type="text"
          maxLength={field.max}
          className={inputClass}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}
