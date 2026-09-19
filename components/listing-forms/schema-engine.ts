/**
 * Client mirror of the backend PropertySchemaService rules used to render subtype-driven forms (Appendix F, §31.4–31.5).
 * The server remains authoritative: every save and submit is re-validated there (H.21).
 */

import type {
  AnswerMap,
  ComponentDef,
  ComponentInstance,
  FieldCondition,
  FieldDef,
  FieldGroup,
  FormSchema,
  SchemaAnswers,
} from '@/types/operator';

export const COMPONENTS_KEY = 'components';
export const FIELD_GROUPS: FieldGroup[] = ['facts', 'commercial', 'intelligence'];

/** Agent-authored fields are never shown to or submitted by Property Operators (§5.2). */
export const OPERATOR_HIDDEN_FIELDS = ['agent_observation'];

type ComponentAnswers = Record<string, AnswerMap>;

export function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

function componentAnswers(group: AnswerMap | undefined): ComponentAnswers {
  const raw = group?.[COMPONENTS_KEY];
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as ComponentAnswers) : {};
}

export function lookupAnswer(
  answers: SchemaAnswers,
  fieldKey: string,
  componentKey: string | null,
): unknown {
  for (const group of FIELD_GROUPS) {
    const source = answers[group] ?? {};
    if (componentKey) {
      const nested = componentAnswers(source)[componentKey];
      if (nested && nested[fieldKey] !== undefined) return nested[fieldKey];
    }
    if (source[fieldKey] !== undefined) return source[fieldKey];
  }
  return undefined;
}

export function conditionMatches(
  condition: FieldCondition,
  answers: SchemaAnswers,
  componentKey: string | null,
): boolean {
  const value = lookupAnswer(answers, condition.field, componentKey);
  if (Array.isArray(value)) return value.some((item) => condition.in.includes(item as string));
  return value !== undefined && value !== null && condition.in.includes(value as string | number);
}

export function isFieldVisible(field: FieldDef, answers: SchemaAnswers, componentKey: string | null) {
  return !field.visibleWhen || conditionMatches(field.visibleWhen, answers, componentKey);
}

export function isFieldRequired(field: FieldDef, answers: SchemaAnswers, componentKey: string | null) {
  if (field.fixed !== undefined) return false;
  if (field.requiredWhen) return conditionMatches(field.requiredWhen, answers, componentKey);
  return field.required;
}

export function componentCount(component: ComponentDef, answers: SchemaAnswers): number {
  if (component.fixedCount !== undefined) return component.fixedCount;
  const raw = component.countField ? (answers.facts ?? {})[component.countField] : 0;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return 0;
  return Math.min(value, component.max);
}

export function componentInstances(schema: FormSchema, answers: SchemaAnswers): ComponentInstance[] {
  return schema.components.flatMap((component) =>
    Array.from({ length: componentCount(component, answers) }, (_, index) => ({
      key: `${component.key}_${index + 1}`,
      type: component.key,
      label: `${component.label} ${index + 1}`,
      index: index + 1,
    })),
  );
}

export function fieldPath(field: FieldDef, componentKey: string | null) {
  return componentKey
    ? `${field.group}.${COMPONENTS_KEY}.${componentKey}.${field.key}`
    : `${field.group}.${field.key}`;
}

export function readAnswer(answers: SchemaAnswers, field: FieldDef, componentKey: string | null): unknown {
  if (field.fixed !== undefined && !componentKey) return field.fixed;
  const group = answers[field.group] ?? {};
  if (!componentKey) return group[field.key];
  return componentAnswers(group)[componentKey]?.[field.key];
}

/** Returns new answers with the value set, or removed when empty so blanks are never sent as answers. */
export function writeAnswer(
  answers: SchemaAnswers,
  field: FieldDef,
  componentKey: string | null,
  value: unknown,
): SchemaAnswers {
  const group: AnswerMap = { ...(answers[field.group] ?? {}) };
  if (!componentKey) {
    if (isEmptyValue(value)) delete group[field.key];
    else group[field.key] = value;
  } else {
    const components = { ...componentAnswers(group) };
    const instance = { ...(components[componentKey] ?? {}) };
    if (isEmptyValue(value)) delete instance[field.key];
    else instance[field.key] = value;
    if (Object.keys(instance).length) components[componentKey] = instance;
    else delete components[componentKey];
    if (Object.keys(components).length) group[COMPONENTS_KEY] = components;
    else delete group[COMPONENTS_KEY];
  }
  return { ...answers, [field.group]: group };
}

/** Removes Operator-hidden fields (and their component copies) before answers are sent. */
export function stripHiddenAnswers(answers: AnswerMap | undefined, hidden = OPERATOR_HIDDEN_FIELDS): AnswerMap {
  const result: AnswerMap = { ...(answers ?? {}) };
  for (const key of hidden) delete result[key];
  const components = componentAnswers(result);
  if (Object.keys(components).length) {
    const cleaned: ComponentAnswers = {};
    for (const [instance, values] of Object.entries(components)) {
      const next = { ...values };
      for (const key of hidden) delete next[key];
      if (Object.keys(next).length) cleaned[instance] = next;
    }
    if (Object.keys(cleaned).length) result[COMPONENTS_KEY] = cleaned;
    else delete result[COMPONENTS_KEY];
  }
  return result;
}

export function hasAnswers(answers: AnswerMap | undefined): boolean {
  return !!answers && Object.keys(answers).length > 0;
}

export function schemaHasGroup(schema: FormSchema, group: FieldGroup, hidden = OPERATOR_HIDDEN_FIELDS) {
  return schema.fields.some((field) => field.group === group && !hidden.includes(field.key));
}

/** Money amounts and choices shown in summaries. */
export function displayAnswer(field: FieldDef, value: unknown): string {
  if (isEmptyValue(value)) return 'Not answered';
  if (field.type === 'money') {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)
      : String(value);
  }
  const label = (raw: unknown) => field.options?.find((option) => option.value === raw)?.label ?? String(raw);
  if (Array.isArray(value)) return value.map(label).join(', ');
  return label(value);
}

/**
 * The API merges PATCH answers shallowly into the stored group (`{...stored, ...sent}`), so an answer the user cleared
 * must be sent as `null` to be removed. Component answers are replaced as a whole object.
 */
export function withClearedKeys(original: AnswerMap | undefined, next: AnswerMap | undefined): AnswerMap {
  const result: AnswerMap = { ...(next ?? {}) };
  for (const key of Object.keys(original ?? {})) {
    if (key in result || OPERATOR_HIDDEN_FIELDS.includes(key)) continue;
    result[key] = key === COMPONENTS_KEY ? {} : null;
  }
  return result;
}

export function answersEqual(left: AnswerMap | undefined, right: AnswerMap | undefined): boolean {
  const normalize = (raw: AnswerMap | undefined) => {
    const value = stripHiddenAnswers(raw);
    const entries = Object.entries(value).filter(([, item]) => !isEmptyValue(item));
    const components = value[COMPONENTS_KEY];
    const cleaned = entries.filter(([key]) => key !== COMPONENTS_KEY || (components && typeof components === 'object' && Object.keys(components as object).length));
    return JSON.stringify(Object.fromEntries(cleaned.sort(([a], [b]) => a.localeCompare(b))));
  };
  return normalize(left) === normalize(right);
}
