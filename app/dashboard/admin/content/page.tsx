'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileText, ImageIcon, Plus, RefreshCw, Save, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { siteContentApi, ApiError } from '@/lib/api';
import { uploadToFileService } from '@/lib/upload';
import type { SiteContent, UpsertSiteContentDto } from '@/types';
import { UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { DEFAULT_FAQS, DEFAULT_FAQ_CATEGORIES, FAQ_CONTENT_VERSION } from '@/app/faq/faq-data';
import { DEFAULT_TERMS_SECTIONS, TERMS_CONTENT_VERSION } from '@/app/terms/terms-data';

const PRESETS = [
  { page: 'home', section: 'hero', label: 'Home hero' },
  { page: 'home', section: 'features', label: 'Home features' },
  { page: 'home', section: 'how_it_works', label: 'Home process' },
  { page: 'home', section: 'cta', label: 'Home CTA' },
  { page: 'home', section: 'trust_stats', label: 'Home trust stats' },
  { page: 'about', section: 'hero', label: 'About hero' },
  { page: 'about', section: 'mission', label: 'About mission' },
  { page: 'about', section: 'problems', label: 'About problems solved' },
  { page: 'about', section: 'capabilities', label: 'About capabilities' },
  { page: 'about', section: 'values', label: 'About values' },
  { page: 'about', section: 'cta', label: 'About CTA' },
  { page: 'contact', section: 'hero', label: 'Contact hero' },
  { page: 'contact', section: 'form_intro', label: 'Contact form intro' },
  { page: 'contact', section: 'support', label: 'Contact support details' },
  { page: 'contact', section: 'agent_support', label: 'Contact agent support' },
  { page: 'contact', section: 'social', label: 'Contact social links' },
  { page: 'contact', section: 'operations', label: 'Contact operations note' },
  { page: 'faq', section: 'hero', label: 'FAQ hero' },
  { page: 'faq', section: 'questions', label: 'FAQ questions' },
  { page: 'faq', section: 'cta', label: 'FAQ bottom CTA' },
  { page: 'privacy', section: 'hero', label: 'Privacy hero' },
  { page: 'privacy', section: 'intro', label: 'Privacy intro' },
  { page: 'privacy', section: 'sections', label: 'Privacy sections' },
  { page: 'privacy', section: 'contact', label: 'Privacy contact' },
  { page: 'privacy', section: 'agreement', label: 'Privacy agreement' },
  { page: 'terms', section: 'hero', label: 'Terms hero' },
  { page: 'terms', section: 'documents', label: 'Terms documents' },
  { page: 'terms', section: 'contact', label: 'Terms contact' },
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
  'home:trust_stats': {
    page: 'home',
    section: 'trust_stats',
    title: 'What our users say',
    subtitle: 'Real experiences from people who inspect smarter with Veriq.',
    data: { testimonials: [] },
  },
  'home:cta': {
    page: 'home',
    section: 'cta',
    title: 'Ready to inspect smarter?',
    body: 'Browse verified listings and unlock the details that matter before visiting.',
    data: {
      cards: [
        { title: 'For Property Seekers', desc: 'Unlock verified reports and make informed decisions before visiting.' },
        { title: 'For Agents', desc: 'Build trust, earn better visibility, and attract quality-conscious clients.' },
      ],
    },
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
  'contact:form_intro': {
    page: 'contact',
    section: 'form_intro',
    title: 'Send us a Message',
    body: "Fill in the form below and we'll get back to you through our official support channels.",
  },
  'contact:agent_support': {
    page: 'contact',
    section: 'agent_support',
    title: 'Agent Support',
    body: 'For agents with listing disputes, payout queries, or verification issues — use the agent support channel.',
    data: { agentEmail: 'agents@veriqproperty.com' },
  },
  'contact:social': {
    page: 'contact',
    section: 'social',
    title: 'Follow & Connect',
    body: 'Stay updated with property intelligence tips, platform news, and market insights.',
    data: {
      links: [
        { label: 'YouTube', href: 'https://www.youtube.com/@veriqproperty' },
        { label: 'TikTok', href: 'https://www.tiktok.com/@veriqproperty' },
        { label: 'Facebook', href: 'https://www.facebook.com/@veriqproperty' },
        { label: 'Instagram', href: 'https://www.instagram.com/veriqproperty' },
      ],
    },
  },
  'about:problems': {
    page: 'about',
    section: 'problems',
    title: 'Problems We Solve',
    body: 'We reduce these problems through structured property intelligence, freshness verification, trust-based agent performance, and detailed pre-inspection disclosures.',
    data: {
      items: [
        'Wasted inspections due to misleading listings',
        'Poor disclosure of known property issues',
        'Fake or unavailable listed properties',
        'Unnecessary transportation costs to inspect bad listings',
        'Inability to compare agents by actual performance',
        'No pre-inspection intelligence for renters',
      ],
    },
  },
  'about:capabilities': {
    page: 'about',
    section: 'capabilities',
    title: 'What You Can Do on Veriq',
    data: {
      items: [
        { title: 'View Verified Property Previews', desc: 'Browse moderated listings with real, accurate visual representation.' },
        { title: 'Unlock Intelligence Reports', desc: 'Access detailed property intelligence including environmental and accessibility data.' },
        { title: 'Compare Agent Trust Performance', desc: 'See real metrics: response speed, listing accuracy, and inspection success rates.' },
        { title: 'Make Informed Decisions', desc: 'Decide whether a property is worth visiting before you ever leave home.' },
        { title: 'Connect with Trusted Agents', desc: 'Work with agents who have verified track records and accountability.' },
        { title: 'Inspect Smarter', desc: 'Walk into every inspection with full context — confident, not guessing.' },
      ],
    },
  },
  'about:values': {
    page: 'about',
    section: 'values',
    title: 'Our Core Values',
    body: 'The principles that guide every decision we make.',
    data: {
      items: [
        { title: 'Trust First', description: 'Every feature we build is designed to increase transparency and reduce deception in the property market.' },
        { title: 'Verified Intelligence', description: 'We provide structured, moderated data — not just user-submitted photos that may mislead you.' },
        { title: 'Decision Confidence', description: "Our goal is for you to walk into every inspection already knowing whether it's worth your time." },
        { title: 'Agent Excellence', description: 'We reward professionalism, accuracy, and responsiveness — not just listing volume.' },
      ],
    },
  },
  'about:cta': {
    page: 'about',
    section: 'cta',
    title: 'Join the Smarter Property Movement',
    body: "Whether you're a renter, buyer, or agent — Veriq Property is building the trust infrastructure Nigeria's property market needs.",
  },
  'faq:hero': {
    page: 'faq',
    section: 'hero',
    title: 'FAQ',
    subtitle: 'Frequently Asked Questions',
    body: 'Everything you need to know about Veriq Property — for renters, property seekers, and agents.',
  },
  'faq:questions': {
    page: 'faq',
    section: 'questions',
    title: 'Questions',
    data: {
      faqVersion: FAQ_CONTENT_VERSION,
      faqs: DEFAULT_FAQS,
      categories: DEFAULT_FAQ_CATEGORIES,
    },
  },
  'faq:cta': {
    page: 'faq',
    section: 'cta',
    title: 'Still have questions?',
    body: 'Our support team is happy to help with any inquiry not covered above.',
  },
  'privacy:hero': {
    page: 'privacy',
    section: 'hero',
    title: 'Privacy Policy',
    subtitle: 'Privacy',
    body: 'Last Updated: June 2026',
  },
  'privacy:intro': {
    page: 'privacy',
    section: 'intro',
    body: 'Veriq Property ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect the information you provide when using our website, forms, and services.',
  },
  'privacy:sections': {
    page: 'privacy',
    section: 'sections',
    title: 'Privacy Sections',
    data: {
      sections: [
        { title: 'Information We Collect', body: 'We may collect information such as:', items: ['Name', 'Phone number', 'Email address', 'Property preferences', 'Agent information'] },
        { title: 'How We Use Your Information', body: 'We use the information we collect to respond to inquiries, process registrations, communicate with users, improve services, and provide information about Veriq Property.' },
        { title: 'Information Sharing', body: 'We do not sell, rent, or trade your personal information to third parties.' },
        { title: 'Data Security', body: 'We take reasonable measures to protect your information from unauthorized access, loss, misuse, or disclosure.' },
      ],
    },
  },
  'privacy:contact': {
    page: 'privacy',
    section: 'contact',
    title: 'Contact Us',
    body: 'If you have questions about this Privacy Policy or how your information is used, please contact us:',
    data: { website: 'www.veriqproperty.com', email: 'info@veriqproperty.com' },
  },
  'privacy:agreement': {
    page: 'privacy',
    section: 'agreement',
    body: 'By using our website, forms, or services, you agree to this Privacy Policy.',
  },
  'terms:hero': {
    page: 'terms',
    section: 'hero',
    title: 'Terms & Conditions',
    subtitle: 'Legal Documents',
    body: 'Please read these terms carefully before using the Veriq Property platform.',
  },
  'terms:documents': {
    page: 'terms',
    section: 'documents',
    title: 'Terms sections',
    body: 'Last Updated: 8 August 2026',
    data: {
      termsVersion: TERMS_CONTENT_VERSION,
      sections: DEFAULT_TERMS_SECTIONS,
    },
  },
  'terms:contact': {
    page: 'terms',
    section: 'contact',
    title: 'Contact Us',
    body: 'For questions or disputes regarding these terms, contact our support team through our Contact page.',
  },
};

function contentKey(item: Pick<SiteContent, 'page' | 'section'>) {
  return `${item.page}:${item.section}`;
}

type FAQItem = { q: string; a: string; categories?: string[] };
type FAQCategory = { label: string; value: string };

function parseDataJson(dataJson: string): Record<string, unknown> | null {
  if (!dataJson.trim()) return {};
  try {
    return JSON.parse(dataJson) as Record<string, unknown>;
  } catch {
    return null;
  }
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
  const [isFAQQuestionModalOpen, setIsFAQQuestionModalOpen] = useState(false);
  const [faqQuestionDraft, setFAQQuestionDraft] = useState({
    q: '',
    a: '',
    categories: '',
  });

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
    const isStaleFAQ = page === 'faq' && section === 'questions' && existing?.data?.faqVersion !== FAQ_CONTENT_VERSION;
    const isStaleTerms = page === 'terms' && section === 'documents' && existing?.data?.termsVersion !== TERMS_CONTENT_VERSION;
    const selectedContent = isStaleFAQ || isStaleTerms ? undefined : existing;
    setForm({
      page,
      section,
      title: selectedContent?.title ?? fallback?.title ?? '',
      subtitle: selectedContent?.subtitle ?? fallback?.subtitle ?? '',
      body: selectedContent?.body ?? fallback?.body ?? '',
      data: selectedContent?.data ?? fallback?.data,
    });
    setDataJson(JSON.stringify(selectedContent?.data ?? fallback?.data ?? {}, null, 2));
  };

  const updateDataValue = (key: string, value: unknown) => {
    const parsed = dataJson.trim() ? JSON.parse(dataJson) as Record<string, unknown> : {};
    const next = { ...parsed, [key]: value };
    setForm((prev) => ({ ...prev, data: next }));
    setDataJson(JSON.stringify(next, null, 2));
  };

  const structuredData = useMemo(() => parseDataJson(dataJson), [dataJson]);
  const isFAQQuestions = form.page === 'faq' && form.section === 'questions';
  const isTermsDocuments = form.page === 'terms' && form.section === 'documents';

  const updateStructuredData = (next: Record<string, unknown>) => {
    setForm((prev) => ({ ...prev, data: next }));
    setDataJson(JSON.stringify(next, null, 2));
  };

  const updateFAQItem = (index: number, patch: Partial<FAQItem>) => {
    const base = structuredData ?? {};
    const faqs = Array.isArray(base.faqs) ? ([...base.faqs] as FAQItem[]) : [];
    faqs[index] = { ...(faqs[index] ?? { q: '', a: '', categories: [] }), ...patch };
    updateStructuredData({ ...base, faqs });
  };

  const openFAQQuestionModal = () => {
    if (structuredData === null) {
      toastError('Fix the metadata JSON before adding a FAQ question.');
      return;
    }
    setFAQQuestionDraft({ q: '', a: '', categories: '' });
    setIsFAQQuestionModalOpen(true);
  };

  const addFAQItemFromModal = () => {
    const question = faqQuestionDraft.q.trim();
    const answer = faqQuestionDraft.a.trim();
    if (!question || !answer) {
      toastError('Question and response are required.');
      return;
    }
    const base = structuredData ?? {};
    const faqs = Array.isArray(base.faqs) ? ([...base.faqs] as FAQItem[]) : [];
    updateStructuredData({
      ...base,
      faqs: [
        ...faqs,
        {
          q: question,
          a: answer,
          categories: faqQuestionDraft.categories
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        },
      ],
    });
    setIsFAQQuestionModalOpen(false);
  };

  const removeFAQItem = (index: number) => {
    const base = structuredData ?? {};
    const faqs = Array.isArray(base.faqs) ? ([...base.faqs] as FAQItem[]) : [];
    updateStructuredData({ ...base, faqs: faqs.filter((_, itemIndex) => itemIndex !== index) });
  };

  const updateFAQCategory = (index: number, patch: Partial<FAQCategory>) => {
    const base = structuredData ?? {};
    const categories = Array.isArray(base.categories) ? ([...base.categories] as FAQCategory[]) : [];
    categories[index] = { ...(categories[index] ?? { label: '', value: '' }), ...patch };
    updateStructuredData({ ...base, categories });
  };

  const addFAQCategory = () => {
    const base = structuredData ?? {};
    const categories = Array.isArray(base.categories) ? ([...base.categories] as FAQCategory[]) : [];
    updateStructuredData({ ...base, categories: [...categories, { label: '', value: '' }] });
  };

  const removeFAQCategory = (index: number) => {
    const base = structuredData ?? {};
    const categories = Array.isArray(base.categories) ? ([...base.categories] as FAQCategory[]) : [];
    updateStructuredData({ ...base, categories: categories.filter((_, itemIndex) => itemIndex !== index) });
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
        data: dataJson.trim()
          ? {
              ...JSON.parse(dataJson),
              ...(isFAQQuestions ? { faqVersion: FAQ_CONTENT_VERSION } : {}),
              ...(isTermsDocuments ? { termsVersion: TERMS_CONTENT_VERSION } : {}),
            }
          : undefined,
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
    <>
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-veriq-secondary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-veriq-secondary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-navy-900">Site Content</h1>
          </div>
          <p className="text-sm text-veriq-muted">
            Update static Home, About, Contact, FAQ, Privacy, and Terms content without changing code.
          </p>
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

              {isFAQQuestions && (
                <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-base font-bold text-navy-900">FAQ Questions & Responses</h2>
                      <p className="text-xs text-slate-500">Edit each question, answer, and category without touching JSON.</p>
                    </div>
                    <button type="button" onClick={openFAQQuestionModal} className="btn-primary !py-2 !text-xs inline-flex items-center gap-2">
                      <Plus className="h-4 w-4" /> Add Question
                    </button>
                  </div>

                  {structuredData === null ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Fix the metadata JSON below to use the structured FAQ editor again.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {(Array.isArray(structuredData.faqs) ? (structuredData.faqs as FAQItem[]) : []).map((faq, index) => (
                          <div key={index} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Question {index + 1}</p>
                              <button
                                type="button"
                                onClick={() => removeFAQItem(index)}
                                className="rounded-lg border border-red-100 p-2 text-red-500 transition-colors hover:bg-red-50"
                                aria-label={`Remove question ${index + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="label">Question</label>
                                <input
                                  value={faq.q ?? ''}
                                  onChange={(e) => updateFAQItem(index, { q: e.target.value })}
                                  className="input"
                                  placeholder="What is Veriq Property?"
                                />
                              </div>
                              <div>
                                <label className="label">Response</label>
                                <textarea
                                  value={faq.a ?? ''}
                                  onChange={(e) => updateFAQItem(index, { a: e.target.value })}
                                  className="input min-h-[110px] resize-y"
                                  placeholder="Write the answer users should see."
                                />
                              </div>
                              <div>
                                <label className="label">Categories</label>
                                <input
                                  value={(faq.categories ?? []).join(', ')}
                                  onChange={(e) => updateFAQItem(index, {
                                    categories: e.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                                  })}
                                  className="input"
                                  placeholder="renter, payment"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-navy-900">FAQ Categories</h3>
                            <p className="text-xs text-slate-500">These drive the category filter chips on the FAQ page.</p>
                          </div>
                          <button type="button" onClick={addFAQCategory} className="btn-outline !py-2 !text-xs inline-flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Add Category
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(Array.isArray(structuredData.categories) ? (structuredData.categories as FAQCategory[]) : []).map((category, index) => (
                            <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                              <input
                                value={category.label ?? ''}
                                onChange={(e) => updateFAQCategory(index, { label: e.target.value })}
                                className="input"
                                placeholder="For Renters"
                              />
                              <input
                                value={category.value ?? ''}
                                onChange={(e) => updateFAQCategory(index, { value: e.target.value })}
                                className="input"
                                placeholder="renter"
                              />
                              <button
                                type="button"
                                onClick={() => removeFAQCategory(index)}
                                className="rounded-lg border border-red-100 px-3 text-red-500 transition-colors hover:bg-red-50"
                                aria-label={`Remove category ${index + 1}`}
                              >
                                <Trash2 className="mx-auto h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <details className="rounded-xl border border-slate-200 bg-white p-4" open={!isFAQQuestions}>
                <summary className="cursor-pointer text-sm font-bold text-navy-900">Advanced Metadata JSON</summary>
                <div className="mt-3">
                  <label className="label">Metadata JSON</label>
                  <textarea
                    value={dataJson}
                    onChange={(e) => setDataJson(e.target.value)}
                    className="input min-h-[120px] resize-y font-mono text-xs"
                    placeholder='{"supportEmail":"support@veriqproperty.com","agentEmail":"agents@veriqproperty.com"}'
                  />
                </div>
              </details>

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

    <Modal
      isOpen={isFAQQuestionModalOpen}
      onClose={() => setIsFAQQuestionModalOpen(false)}
      title="Add FAQ Question"
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="label">Question</label>
          <input
            value={faqQuestionDraft.q}
            onChange={(e) => setFAQQuestionDraft((prev) => ({ ...prev, q: e.target.value }))}
            className="input"
            placeholder="What is Veriq Property?"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Response</label>
          <textarea
            value={faqQuestionDraft.a}
            onChange={(e) => setFAQQuestionDraft((prev) => ({ ...prev, a: e.target.value }))}
            className="input min-h-[150px] resize-y"
            placeholder="Write the answer users should see."
          />
        </div>
        <div>
          <label className="label">Categories</label>
          <input
            value={faqQuestionDraft.categories}
            onChange={(e) => setFAQQuestionDraft((prev) => ({ ...prev, categories: e.target.value }))}
            className="input"
            placeholder="renter, payment"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsFAQQuestionModalOpen(false)}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-navy-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button type="button" onClick={addFAQItemFromModal} className="btn-primary">
            Add Question
          </button>
        </div>
      </div>
    </Modal>
    </>
  );
}
