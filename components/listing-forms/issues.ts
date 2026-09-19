import { ApiError } from '@/lib/api';
import type { ReadinessBlocker, SchemaIssue } from '@/types/operator';

export interface ParsedApiError {
  message: string;
  statusCode: number | null;
  issues: SchemaIssue[];
  blockers: ReadinessBlocker[];
}

function isIssue(value: unknown): value is SchemaIssue {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as SchemaIssue).path === 'string' &&
    typeof (value as SchemaIssue).message === 'string'
  );
}

function isBlocker(value: unknown): value is ReadinessBlocker {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ReadinessBlocker).code === 'string' &&
    typeof (value as ReadinessBlocker).message === 'string'
  );
}

/** Normalises backend errors, keeping structured schema issues `{path,message}` and blockers `{code,message}`. */
export function parseApiError(error: unknown, fallback = 'Something went wrong. Please try again.'): ParsedApiError {
  if (error instanceof ApiError) {
    const details = error.details ?? [];
    return {
      message: error.message || fallback,
      statusCode: error.statusCode,
      issues: details.filter(isIssue),
      blockers: details.filter(isBlocker),
    };
  }
  return {
    message: error instanceof Error && error.message ? error.message : fallback,
    statusCode: null,
    issues: [],
    blockers: [],
  };
}

export function errorMessage(error: unknown, fallback?: string) {
  return parseApiError(error, fallback).message;
}

/** Issues under a prefix (e.g. `property.` or `units.Apartment 1.`) with the prefix removed. */
export function scopeIssues(issues: SchemaIssue[], prefix: string): SchemaIssue[] {
  return issues
    .filter((issue) => issue.path.startsWith(prefix))
    .map((issue) => ({ ...issue, path: issue.path.slice(prefix.length) }));
}

export function prefixIssues(issues: SchemaIssue[], prefix: string): SchemaIssue[] {
  return issues.map((issue) => ({ ...issue, path: `${prefix}${issue.path}` }));
}
