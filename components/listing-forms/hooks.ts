'use client';

import { useCallback, useEffect, useState } from 'react';
import { propertySchemasApi } from '@/lib/api/operator';
import type { FormSchema, SchemaCatalogue } from '@/types/operator';
import { errorMessage } from './issues';

const schemaCache = new Map<string, Promise<FormSchema>>();
let catalogueCache: Promise<SchemaCatalogue> | null = null;

export function loadSchema(schemaId: string): Promise<FormSchema> {
  const cached = schemaCache.get(schemaId);
  if (cached) return cached;
  const request = propertySchemasApi.get(schemaId).then((response) => response.data);
  request.catch(() => schemaCache.delete(schemaId));
  schemaCache.set(schemaId, request);
  return request;
}

export function loadCatalogue(): Promise<SchemaCatalogue> {
  if (catalogueCache) return catalogueCache;
  const request = propertySchemasApi.catalogue().then((response) => response.data);
  request.catch(() => {
    catalogueCache = null;
  });
  catalogueCache = request;
  return request;
}

/** Loads a versioned form schema by id (e.g. `residential.unit.miniflat`). */
export function useSchema(schemaId: string | null | undefined) {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(!!schemaId);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!schemaId) {
      setSchema(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadSchema(schemaId)
      .then((result) => !cancelled && setSchema(result))
      .catch((caught) => !cancelled && setError(errorMessage(caught, 'Unable to load the form')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [schemaId, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  return { schema, loading, error, reload };
}

export function useCatalogue() {
  const [catalogue, setCatalogue] = useState<SchemaCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadCatalogue()
      .then((result) => !cancelled && setCatalogue(result))
      .catch((caught) => !cancelled && setError(errorMessage(caught, 'Unable to load property categories')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  return { catalogue, loading, error, reload };
}
