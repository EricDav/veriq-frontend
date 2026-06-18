'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileText, ImageIcon, RefreshCw, Save, ShieldCheck, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { siteContentApi, ApiError } from '@/lib/api';
import { uploadToFileService } from '@/lib/upload';
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
  page: 'home',
  section: 'hero',
  title: '',
  subtitle: '',
  body: '',
};

const DEFAULT_CONTENT: Record<string, UpsertSiteContentDto> = {
  'home:hero': {
    page: 'home',
    section: 'hero',
    title: 'Know Before You Go.',
    subtitle: 'Property Intelligence Platform',
    body: 'Stop wasting time on misleading listings and pointless inspections. Veriq Property gives you verified property intelligence — so you inspect smarter.',
    data: {
      trustPoints: [
        'Verified property previews',
        'Agent trust scores & ratings',
        'Pre-inspection intelligence reports',
      ],
      heroImageUrl: '',
    },
  },
  'home:features': {
    page: 'home',
    section: 'features',
    title: 'Everything You Need to Inspect Smarter',
    subtitle: 'Verified intelligence before you spend money visiting a property.',
  },
  'home:how_it_works': {
    page: 'home',
    section: 'how_it_works',
    title: 'How Veriq Works',
    subtitle: 'Search, unlock intelligence, then inspect with confidence.',
  },
  'home:cta': {
    page: 'home',
    section: 'cta',
    title: 'Ready to inspect smarter?',
    body: 'Browse verified listings and unlock the details that matter before visiting.',
  },
  'about:hero': {
    page: 'about',
    section: 'hero',
    title: 'Building a More Trusted Property Ecosystem',
    subtitle: 'We understand the frustrations of the traditional property search process. Veriq Property was built to change it — from the ground up.',
  },
  'about:mission': {
    page: 'about',
    section: 'mission',
    title: 'Our Mission',
    body: 'To make property search in Nigeria more transparent, safer, and less wasteful for everyone involved.',
  },
  'contact:hero': {
    page: 'contact',
    section: 'hero',
    title: "We're Here to Help",
    subtitle: "Whether you're a property seeker, a listing agent, or just exploring — our team is ready to assist you.",
  },
  'contact:support': {
    page: 'contact',
    section: 'support',
    title: 'Support',
    body: 'Reach out to the Veriq Property team for account, listing, payment, or verification support.',
    data: { supportEmail: 'support@veriqproperty.com', agentEmail: 'agents@veriqproperty.com' },
  },
  'contact:operations': {
    page: 'contact',
    section: 'operations',
    title: 'Operations',
    body: 'Our operations team reviews agent verification, listing quality, and property intelligence submissions.',
  },
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
  const [isUploadingHero, setIsUploadingHero] = useState(false);

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
      const currentKey = `${form.page}:${form.section}`;
      const selected = res.data.find((item) => contentKey(item) === currentKey);
      const fallback = DEFAULT_CONTENT[currentKey] ?? form;
      setForm({
        page: form.page,
        section: form.section,
        title: selected?.title ?? fallback.title ?? '',
        subtitle: selected?.subtitle ?? fallback.subtitle ?? '',
        body: selected?.body ?? fallback.body ?? '',
        data: selected?.data ?? fallback.data,
      });
      setDataJson(JSON.stringify(selected?.data ?? fallback.data ?? {}, null, 2));
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
    const fallback = DEFAULT_CONTENT[`${page}:${section}`];
    setForm({
      page,
      section,
      title: existing?.title ?? fallback?.title ?? '',
      subtitle: existing?.subtitle ?? fallback?.subtitle ?? '',
      body: existing?.body ?? fallback?.body ?? '',
      data: existing?.data ?? fallback?.data,
    });
    setDataJson(JSON.stringify(existing?.data ?? fallback?.data ?? {}, null, 2));
  };

  const updateDataValue = (key: string, value: unknown) => {
    const parsed = dataJson.trim() ? JSON.parse(dataJson) as Record<string, unknown> : {};
    const next = { ...parsed, [key]: value };
    setForm((prev) => ({ ...prev, data: next }));
    setDataJson(JSON.stringify(next, null, 2));
  };

  const handleHeroImageUpload = async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingHero(true);
    try {
      const uploaded = await uploadToFileService(file);
      updateDataValue('heroImageUrl', uploaded.url);
      success('Hero image uploaded.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to upload hero image');
    } finally {
      setIsUploadingHero(false);
    }
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

              {form.section === 'hero' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="label flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-veriq-secondary" /> Hero Image
                  </label>
                  <input
                    value={(() => {
                      try {
                        return String((dataJson ? JSON.parse(dataJson) : {}).heroImageUrl ?? '');
                      } catch {
                        return '';
                      }
                    })()}
                    onChange={(e) => {
                      try {
                        updateDataValue('heroImageUrl', e.target.value);
                      } catch {
                        toastError('Fix the metadata JSON before changing the hero image');
                      }
                    }}
                    className="input"
                    placeholder="https://... or upload an image"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="btn-outline !py-2 !text-xs inline-flex cursor-pointer items-center gap-2">
                      {isUploadingHero ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4" />}
                      {isUploadingHero ? 'Uploading...' : 'Upload Image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          handleHeroImageUpload(e.target.files?.[0]);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                    <p className="text-xs text-slate-500">Saved as metadata key <span className="font-mono">heroImageUrl</span>.</p>
                  </div>
                </div>
              )}

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
