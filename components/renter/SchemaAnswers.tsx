'use client';

import { useEffect, useState } from 'react';
import { formSchemasApi } from '@/lib/api/renter';
import type { FormSchemaDefinition, SchemaField } from '@/types/renter';
import { Eyebrow } from '@/components/ui';
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
  exclude = [],
}: {
  title?: string;
  answers: Record<string, unknown> | null | undefined;
  schema: FormSchemaDefinition | null;
  exclude?: string[];
}) {
  const rows = Object.entries(answers ?? {})
    .filter(([key]) => !exclude.includes(key))
    .map(([key, value]) => ({ key, label: answerLabel(schema, key), value: answerValue(schema, key, value) }))
    .filter((row): row is { key: string; label: string; value: string } => !!row.value);
  if (!rows.length) return null;

  return (
    <div>
      {title && (
        <p className="mb-2">
          <Eyebrow>{title}</Eyebrow>
        </p>
      )}
      <dl className="grid grid-cols-1 gap-2 wide:grid-cols-2">
        {rows.map((row) => (
          <div key={row.key} className="rounded-unit border border-[#ffffff18] bg-[#070b1444] px-[17px] py-2.5">
            <dt className="text-ui-sm text-muted-foreground">{row.label}</dt>
            <dd className="mt-0.5 break-words text-ui-md font-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
