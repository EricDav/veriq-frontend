'use client';

import { useEffect, useState } from 'react';
import { formSchemasApi } from '@/lib/api/renter';
import type { FormSchemaDefinition, SchemaField } from '@/types/renter';
import { formatNaira, humanise } from './format';

const schemaCache = new Map<string, FormSchemaDefinition | null>();

/** Loads a public form schema so answers can be shown with their configured labels. Missing schemas fall back to key names. */
export function useFormSchema(schemaId: string | null): FormSchemaDefinition | null {
  const [schema, setSchema] = useState<FormSchemaDefinition | null>(() => (schemaId ? schemaCache.get(schemaId) ?? null : null));

  useEffect(() => {
    if (!schemaId) return;
    if (schemaCache.has(schemaId)) {
      setSchema(schemaCache.get(schemaId) ?? null);
      return;
    }
    let cancelled = false;
    formSchemasApi
      .get(schemaId)
      .then((res) => {
        schemaCache.set(schemaId, res.data);
        if (!cancelled) setSchema(res.data);
      })
      .catch(() => {
        schemaCache.set(schemaId, null);
        if (!cancelled) setSchema(null);
      });
    return () => {
      cancelled = true;
    };
  }, [schemaId]);

  return schema;
}

function componentField(schema: FormSchemaDefinition | null, key: string): { field: SchemaField; suffix: string } | null {
  if (!schema) return null;
  const match = key.match(/^(.*)_(\d+)$/);
  if (!match) return null;
  const field = schema.fields.find((item) => item.key === match[1]);
  return field ? { field, suffix: ` ${match[2]}` } : null;
}

export function answerLabel(schema: FormSchemaDefinition | null, key: string): string {
  const field = schema?.fields.find((item) => item.key === key);
  if (field) return field.label;
  const component = componentField(schema, key);
  if (component) return `${component.field.label}${component.suffix}`;
  return humanise(key);
}

export function answerValue(schema: FormSchemaDefinition | null, key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const field = schema?.fields.find((item) => item.key === key) ?? componentField(schema, key)?.field;
  const optionLabel = (raw: unknown) => {
    const text = String(raw);
    return field?.options?.find((option) => option.value === text)?.label ?? humanise(text);
  };
  if (Array.isArray(value)) return value.length ? value.map(optionLabel).join(', ') : null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return null;
  if (field?.type === 'money' || /(_amount|_price|_rent|_fee|_charge|_rate)$/.test(key)) {
    const amount = Number(value);
    if (Number.isFinite(amount)) return formatNaira(amount);
  }
  if (typeof value === 'number') return value.toLocaleString('en-NG');
  return optionLabel(value);
}

/** Labelled grid of schema answers (facts, commercial terms or intelligence). Renders nothing when empty. */
export function SchemaAnswerGrid({
  title,
  answers,
  schema,
  tone = 'light',
  exclude = [],
}: {
  title?: string;
  answers: Record<string, unknown> | null | undefined;
  schema: FormSchemaDefinition | null;
  tone?: 'light' | 'dark';
  exclude?: string[];
}) {
  const rows = Object.entries(answers ?? {})
    .filter(([key]) => !exclude.includes(key))
    .map(([key, value]) => ({ key, label: answerLabel(schema, key), value: answerValue(schema, key, value) }))
    .filter((row): row is { key: string; label: string; value: string } => !!row.value);
  if (!rows.length) return null;

  const dark = tone === 'dark';
  return (
    <div>
      {title && <p className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${dark ? 'text-white/50' : 'text-slate-400'}`}>{title}</p>}
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.key} className={`rounded-xl px-3 py-2.5 ${dark ? 'border border-white/10 bg-white/5' : 'border border-slate-100 bg-slate-50'}`}>
            <dt className={`text-[11px] ${dark ? 'text-white/55' : 'text-slate-500'}`}>{row.label}</dt>
            <dd className={`mt-0.5 break-words text-sm font-medium ${dark ? 'text-white' : 'text-navy-900'}`}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
