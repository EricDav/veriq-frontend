import type { ComponentInstance, FieldCondition, FieldDef, FieldGroup, FormSchema, SchemaAnswers } from '@/types/agent';

export const COMPONENT_KEY = 'components';

type Group = Record<string, unknown>;
export type ComponentValues = Record<string, Record<string, unknown>>;

export const groupOf = (answers: SchemaAnswers, group: FieldGroup): Group => (answers[group] ?? {}) as Group;

/** Mirrors PropertySchemaService.components(): repeatable component instances from count fields. */
export function componentInstances(schema: FormSchema, answers: SchemaAnswers): ComponentInstance[] {
  return schema.components.flatMap((component) => {
    let total = 0;
    if (component.fixedCount !== undefined) total = component.fixedCount;
    else if (component.countField) {
      const value = Number(groupOf(answers, 'facts')[component.countField]);
      total = Number.isInteger(value) && value > 0 ? Math.min(value, component.max) : 0;
    }
    return Array.from({ length: total }, (_, index) => ({
      key: `${component.key}_${index + 1}`,
      type: component.key,
      label: `${component.label} ${index + 1}`,
      index: index + 1,
    }));
  });
}

function lookup(answers: SchemaAnswers, fieldKey: string, componentKey: string | null): unknown {
  for (const group of ['facts', 'commercial', 'intelligence'] as const) {
    const source = groupOf(answers, group);
    if (componentKey) {
      const nested = ((source[COMPONENT_KEY] as ComponentValues | undefined) ?? {})[componentKey];
      if (nested && nested[fieldKey] !== undefined) return nested[fieldKey];
    }
    if (source[fieldKey] !== undefined) return source[fieldKey];
  }
  return undefined;
}

export function matches(condition: FieldCondition, answers: SchemaAnswers, componentKey: string | null) {
  const value = lookup(answers, condition.field, componentKey);
  if (Array.isArray(value)) return value.some((item) => condition.in.includes(item as string));
  return value !== undefined && value !== null && condition.in.includes(value as string | number);
}

export const isVisible = (field: FieldDef, answers: SchemaAnswers, componentKey: string | null) =>
  !field.visibleWhen || matches(field.visibleWhen, answers, componentKey);

export const isRequired = (field: FieldDef, answers: SchemaAnswers, componentKey: string | null) =>
  field.requiredWhen ? matches(field.requiredWhen, answers, componentKey) : field.required;

export function readValue(answers: SchemaAnswers, field: FieldDef, componentKey: string | null): unknown {
  const group = groupOf(answers, field.group);
  if (!componentKey) return field.fixed ?? group[field.key];
  return ((group[COMPONENT_KEY] as ComponentValues | undefined) ?? {})[componentKey]?.[field.key];
}

export function writeValue(answers: SchemaAnswers, field: FieldDef, componentKey: string | null, value: unknown): SchemaAnswers {
  const group = { ...groupOf(answers, field.group) };
  if (!componentKey) {
    group[field.key] = value;
  } else {
    const components = { ...((group[COMPONENT_KEY] as ComponentValues | undefined) ?? {}) };
    components[componentKey] = { ...(components[componentKey] ?? {}), [field.key]: value };
    group[COMPONENT_KEY] = components;
  }
  return { ...answers, [field.group]: group };
}

export const isEmptyValue = (value: unknown) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

export function formatAnswer(field: FieldDef | undefined, value: unknown): string {
  if (isEmptyValue(value)) return '—';
  const optionLabel = (raw: unknown) => field?.options?.find((option) => option.value === raw)?.label ?? String(raw).replace(/_/g, ' ');
  if (Array.isArray(value)) return value.map(optionLabel).join(', ');
  if (field?.type === 'money') return `₦${Number(value).toLocaleString('en-NG')}`;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return field?.options ? optionLabel(value) : String(value);
}

export const GROUP_LABELS: Record<FieldGroup, string> = {
  facts: 'Facts',
  commercial: 'Commercial terms',
  intelligence: 'Structured intelligence',
};

/** Fields for one group, split into top-level and per component instance. */
export function groupLayout(schema: FormSchema, answers: SchemaAnswers, group: FieldGroup) {
  const fields = schema.fields.filter((field) => field.group === group);
  const topLevel = fields.filter((field) => !field.component);
  const instances = componentInstances(schema, answers);
  const perComponent = instances
    .map((instance) => ({ instance, fields: fields.filter((field) => field.component === instance.type) }))
    .filter((entry) => entry.fields.length > 0);
  return { topLevel, perComponent };
}
