'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileText, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { siteContentApi, ApiError } from '@/lib/api';
import type { SiteContent, UpsertSiteContentDto } from '@/types';
import { UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

const PRESETS = [
  { page: 'home', section: 'hero', label: 'Home hero' },
  { page: 'home', section: 'features', label: 'Home features' },
  { page: 'home', section: 'how_it_works', label: 'Home process' },
  { page: 'home', section: 'cta', label: 'Home CTA' },
  { page: 'about', section: 'hero', label: 'About hero' },
  { page: 'about', section: 'mission', label: 'About mission' },
  { page: 'contact', section: 'hero', label: 'Contact hero' },
  { page: 'contact', section: 'support', label: 'Contact support details' },
  { page: 'contact', section: 'operations', label: 'Contact operations note' },
];

const EMPTY_FORM: UpsertSiteContentDto = {
  page: 'about',
  section: 'hero',
  title: '',
  subtitle: '',
  body: '',
};

function contentKey(item: Pick<SiteContent, 'page' | 'section'>) {
  return `${item.page}:${item.section}`;
}

export default function AdminContentPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [items, setItems] = useState<SiteContent[]>([]);
  const [form, setForm] = useState<UpsertSiteContentDto>(EMPTY_FORM);
  const [dataJson, setDataJson] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role !== UserRole.ADMIN) {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  const byKey = useMemo(() => {
    const map = new Map<string, SiteContent>();
    items.forEach((item) => map.set(contentKey(item), item));
    return map;
  }, [items]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await siteContentApi.list();
      setItems(res.data);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === UserRole.ADMIN) {
      load();
    }
  }, [authLoading, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectPreset = (page: string, section: string) => {
    const existing = byKey.get(`${page}:${section}`);
    setForm({
      page,
      section,
      title: existing?.title ?? '',
      subtitle: existing?.subtitle ?? '',
      body: existing?.body ?? '',
      data: existing?.data ?? undefined,
    });
    setDataJson(existing?.data ? JSON.stringify(existing.data, null, 2) : '');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title?.trim() || undefined,
        subtitle: form.subtitle?.trim() || undefined,
        body: form.body?.trim() || undefined,
        data: dataJson.trim() ? JSON.parse(dataJson) : undefined,
      };
      const res = await siteContentApi.upsert(payload);
      setItems((prev) => {
        const key = contentKey(res.data);
        const without = prev.filter((item) => contentKey(item) !== key);
        return [...without, res.data].sort((a, b) => contentKey(a).localeCompare(contentKey(b)));
      });
      success('Site content saved.');
    } catch (err) {
      toastError(err instanceof SyntaxError ? 'Metadata must be valid JSON' : err instanceof ApiError ? err.message : 'Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.ADMIN) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-veriq-secondary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-veriq-secondary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-navy-900">Site Content</h1>
          </div>
          <p className="text-sm text-veriq-muted">Update static Home, About, and Contact content without changing code.</p>
        </div>
        <button onClick={load} className="btn-primary !text-sm !py-2.5 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="card p-4 h-fit">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Editable sections</p>
          <div className="space-y-2">
            {PRESETS.map((preset) => {
              const active = form.page === preset.page && form.section === preset.section;
              const exists = byKey.has(`${preset.page}:${preset.section}`);
              return (
                <button
                  key={`${preset.page}:${preset.section}`}
                  type="button"
                  onClick={() => selectPreset(preset.page, preset.section)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'border-veriq-secondary bg-veriq-secondary/5 text-veriq-secondary'
                      : 'border-slate-200 text-navy-700 hover:border-slate-300'
                  }`}
                >
                  <span className="block text-sm font-semibold">{preset.label}</span>
                  <span className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                    {exists && <ShieldCheck className="h-3 w-3 text-emerald-500" />}
                    {preset.page}/{preset.section}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={save} className="card p-6 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <LoadingSpinner size="lg" className="text-veriq-secondary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Page</label>
                  <input
                    value={form.page}
                    onChange={(e) => setForm((prev) => ({ ...prev, page: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Section</label>
                  <input
                    value={form.section}
                    onChange={(e) => setForm((prev) => ({ ...prev, section: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Title</label>
                <input
                  value={form.title ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="input"
                  placeholder="Main heading"
                />
              </div>

              <div>
                <label className="label">Subtitle</label>
                <input
                  value={form.subtitle ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                  className="input"
                  placeholder="Short supporting line"
                />
              </div>

              <div>
                <label className="label">Body</label>
                <textarea
                  value={form.body ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                  className="input min-h-[220px] resize-y"
                  placeholder="Longer page content. Use plain text."
                />
              </div>

              <div>
                <label className="label">Metadata JSON</label>
                <textarea
                  value={dataJson}
                  onChange={(e) => setDataJson(e.target.value)}
                  className="input min-h-[120px] resize-y font-mono text-xs"
                  placeholder='{"supportEmail":"support@veriqproperty.com","agentEmail":"agents@veriqproperty.com"}'
                />
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={isSaving} className="btn-primary flex items-center gap-2">
                  {isSaving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
                  Save Content
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
