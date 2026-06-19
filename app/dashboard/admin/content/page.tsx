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
      faqs: [
        { q: 'What is Veriq Property?', a: 'Veriq Property is a property intelligence platform designed to help people make smarter property decisions before physical inspections. We provide verified listings, detailed property intelligence reports, and agent trust scores.', categories: ['renter'] },
        { q: 'Does Veriq Property own the listed properties?', a: 'No. Veriq Property does not own properties listed on the platform. The platform operates as a property intelligence and intermediary service. All listings are submitted by independent agents.', categories: ['renter'] },
        { q: 'Does Veriq Property guarantee properties?', a: 'No. Users are strongly advised to physically inspect properties and independently verify important details before making commitments. We provide intelligence to help you decide — not a guarantee.', categories: ['renter'] },
        { q: 'Why do I need to pay before seeing full property details?', a: 'The consultation/intelligence access fee unlocks detailed property intelligence, structured disclosures, and consultation access. This model ensures agents take listings seriously and users receive quality, curated information.', categories: ['renter', 'payment'] },
        { q: 'What is included after unlocking a property?', a: 'Users may access detailed property images, environmental information, accessibility reports, utility disclosures, and consultation messaging with the listing agent.', categories: ['renter'] },
        { q: 'What happens if the property is no longer available after payment?', a: 'If a property becomes unavailable shortly after consultation unlock, users may qualify for a refund credit. This can be applied toward unlocking similar available properties.', categories: ['renter', 'payment'] },
        { q: 'Will I always receive a cash refund?', a: 'Not necessarily. Refunds may be issued as wallet credit, platform credit, or similar-property access support rather than direct cash refunds.', categories: ['payment'] },
        { q: 'What qualifies for refund consideration?', a: 'Refund consideration may apply to unavailable properties, stale listings, duplicate listings, fake listings, or major listing misrepresentation.', categories: ['payment'] },
        { q: 'What does NOT qualify for refunds?', a: 'Refunds are generally not granted for change of mind, personal preference, or dissatisfaction after inspection. The property must have been genuinely misrepresented or unavailable.', categories: ['payment'] },
        { q: 'How are agents verified?', a: 'Agents may go through identity verification, listing review, profile assessment, and platform moderation before receiving verified status.', categories: ['agent'] },
        { q: 'What are trust scores?', a: 'Trust scores measure agent performance based on listing accuracy, response speed, freshness reliability, and inspection success rate. Higher trust scores earn agents better visibility on the platform.', categories: ['agent'] },
        { q: 'Can agents lose visibility or get suspended?', a: 'Yes. Agents who repeatedly violate platform policies may face reduced visibility, suspension, payout restrictions, or permanent removal from the platform.', categories: ['agent'] },
        { q: 'Can multiple agents post the same property?', a: 'Yes. Users can compare agents based on trust scores and platform performance when multiple agents list the same property.', categories: ['renter', 'agent'] },
        { q: 'Does Veriq Property handle rent payments?', a: 'No. Veriq Property currently focuses on property intelligence and consultation access. Rent payment arrangements are made directly between tenants and landlords/agents.', categories: ['renter'] },
        { q: 'Is Veriq Property available only in Port Harcourt?', a: 'The platform may begin with focused operational regions but is designed for broader expansion over time across Nigeria and beyond.', categories: ['renter'] },
        { q: 'Why do listings expire automatically?', a: 'Automatic expiration helps reduce stale listings and outdated property information. Agents must regularly reconfirm listing availability to keep properties active.', categories: ['renter', 'agent'] },
        { q: 'How does Veriq Property reduce fake listings?', a: 'The platform uses moderation, trust systems, freshness requirements, refund protection, and performance tracking to discourage and identify fake listings.', categories: ['renter', 'agent'] },
        { q: 'Can agents withdraw earnings immediately?', a: 'No. Agent earnings may first enter a temporary Pending Balance review period of up to 48 hours before becoming available for withdrawal.', categories: ['agent', 'payment'] },
        { q: 'What is the minimum withdrawal amount for agents?', a: 'The current minimum withdrawal threshold is ₦5,000. Withdrawals can be made once daily.', categories: ['agent', 'payment'] },
        { q: 'How can I contact Veriq Property?', a: 'Users can contact Veriq Property through official support channels and platform communication systems. Visit our Contact page for details.', categories: ['renter', 'agent'] },
      ],
      categories: [
        { label: 'All', value: 'all' },
        { label: 'For Renters', value: 'renter' },
        { label: 'For Agents', value: 'agent' },
        { label: 'Payments & Refunds', value: 'payment' },
      ],
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
    title: 'Legal Documents',
    body: 'Effective Date: To be confirmed. Contact us for current effective dates.',
    data: {
      sections: [
        { id: 'terms', title: 'Terms of Service', items: [{ heading: '1. About Veriq Property', content: 'Veriq Property is a property intelligence platform designed to help users make more informed property decisions before physical inspections.' }] },
        { id: 'privacy', title: 'Privacy Policy', items: [{ heading: '1. Information We Collect', content: 'We may collect names, phone numbers, email addresses, payment information, device information, and platform activity.' }] },
        { id: 'agent-terms', title: 'Agent Terms & Guidelines', items: [{ heading: '1. Agent Responsibilities', content: 'Agents must provide accurate listing information, maintain professional conduct, provide truthful disclosures, and maintain listing freshness.' }] },
      ],
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
