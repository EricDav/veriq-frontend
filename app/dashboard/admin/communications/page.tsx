'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarClock, ChevronLeft, ChevronRight, Mail, Plus, Send, Users, X } from 'lucide-react';
import { ApiError, communicationsApi, type CommunicationAudienceFilter, type CommunicationCampaign, type CommunicationTemplate } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

type Tab = 'campaigns' | 'direct' | 'templates';
const EMPTY = { name: '', subject: '', body: '', ctaText: '', ctaUrl: '', audienceType: 'users' as const, mode: 'all' as const, activityStatus: '', location: '', unlockStatus: '', propertyStatus: '', sendNow: true, scheduledAt: '' };
const percent = (value: number) => `${Math.round(value * 100)}%`;

export default function CommunicationsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('campaigns');
  const [campaigns, setCampaigns] = useState<CommunicationCampaign[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1); const [pages, setPages] = useState(1);
  const [compose, setCompose] = useState(false); const [form, setForm] = useState<any>(EMPTY);
  const [audience, setAudience] = useState<{ count: number; sample: any[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [templateForm, setTemplateForm] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [history, stats, savedTemplates] = await Promise.all([communicationsApi.list(page), communicationsApi.analytics(), communicationsApi.templates()]);
      setCampaigns(history.data); setPages(history.meta.pages); setAnalytics(stats.data); setTemplates(savedTemplates.data);
    } catch (error) { toast.error(error instanceof ApiError ? error.message : 'Could not load communications.'); }
    finally { setLoading(false); }
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const directUserId = params.get('directUserId');
    if (directUserId) {
      setForm({ ...EMPTY, directUserId, name: `Direct: ${params.get('recipient') || 'recipient'}` });
      setAudience({ count: 1, sample: [] });
      setCompose(true);
    }
  }, []);

  const filter = useMemo<CommunicationAudienceFilter>(() => ({
    audienceType: form.audienceType, mode: form.mode,
    selectedUserIds: form.selectedUserIds?.split(',').map((v: string) => v.trim()).filter(Boolean),
    activityStatus: form.activityStatus || undefined, location: form.location || undefined,
    unlockStatus: form.audienceType === 'users' ? form.unlockStatus || undefined : undefined,
    propertyStatus: form.audienceType === 'agents' ? form.propertyStatus || undefined : undefined,
  }), [form]);

  const preview = async () => { try { const result = await communicationsApi.previewAudience(filter); setAudience(result.data); } catch (error) { toast.error(error instanceof ApiError ? error.message : 'Could not preview audience.'); } };
  const submit = async () => {
    setSaving(true);
    try {
      if (form.directUserId) await communicationsApi.direct({ userId: form.directUserId, subject: form.subject, body: form.body, ctaText: form.ctaText || undefined, ctaUrl: form.ctaUrl || undefined });
      else await communicationsApi.createCampaign({ ...filter, name: form.name, subject: form.subject, body: form.body, ctaText: form.ctaText || undefined, ctaUrl: form.ctaUrl || undefined, sendNow: form.sendNow, scheduledAt: form.sendNow ? undefined : new Date(form.scheduledAt).toISOString() });
      toast.success(form.sendNow ? 'Campaign queued for delivery.' : 'Campaign scheduled.'); setCompose(false); setForm(EMPTY); setAudience(null); await load();
    } catch (error) { toast.error(error instanceof ApiError ? error.message : 'Could not create campaign.'); }
    finally { setSaving(false); }
  };
  const saveTemplate = async () => { setSaving(true); try { const payload = { ...templateForm, audienceType: templateForm.audienceType || undefined, isActive: true }; if (templateForm.id) await communicationsApi.updateTemplate(templateForm.id, payload); else await communicationsApi.createTemplate(payload); toast.success('Template saved.'); setTemplateForm(null); await load(); } catch (error) { toast.error(error instanceof ApiError ? error.message : 'Could not save template.'); } finally { setSaving(false); } };

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-2xl font-bold text-foreground">Communications</h1><p className="text-sm text-muted-foreground">Email users and agents with measurable, auditable campaigns.</p></div><button onClick={() => setCompose(true)} className="btn-primary flex items-center gap-2 !py-2.5"><Plus className="h-4 w-4"/>New campaign</button></header>
    {analytics && <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[
      ['Audience reached', analytics.targeted], ['Sent', analytics.sent], ['Delivery rate', percent(analytics.deliveryRate)], ['Open rate', percent(analytics.openRate)], ['CTA click rate', percent(analytics.clickRate)],
    ].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-[#ffffff12] bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold text-foreground">{value}</p></div>)}</section>}
    <nav className="flex border-b border-[#ffffff12]">{(['campaigns','direct','templates'] as Tab[]).map((item) => <button key={item} onClick={() => setTab(item)} className={`px-5 py-3 text-sm font-medium capitalize ${tab === item ? 'border-b-2 border-[#10b98135] text-primary' : 'text-muted-foreground'}`}>{item === 'direct' ? 'Direct messages' : item}</button>)}</nav>
    {loading ? <div className="py-24 text-center"><LoadingSpinner size="lg"/></div> : tab !== 'templates' ? <section className="overflow-hidden rounded-lg border border-[#ffffff12] bg-card">
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#ffffff08] text-left text-xs text-muted-foreground"><tr><th className="px-5 py-3">Campaign</th><th className="px-4 py-3">Audience</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Delivery</th><th className="px-4 py-3">Engagement</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#ffffff12]">{campaigns.filter(c => tab === 'direct' ? c.kind === 'direct' : c.kind === 'campaign').map(c => <tr key={c.id}><td className="px-5 py-4"><p className="font-semibold text-foreground">{c.name}</p><p className="max-w-xs truncate text-xs text-muted-foreground">{c.subject}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{c.id}</p></td><td className="px-4 py-4 capitalize">{c.audienceType}<br/><span className="text-xs text-muted-foreground">{c.targetedCount} targeted</span></td><td className="px-4 py-4 text-xs">{new Date(c.scheduledAt || c.createdAt).toLocaleString()}</td><td className="px-4 py-4">{c.sentCount} sent<br/><span className="text-xs text-destructive">{c.failedCount} failed</span></td><td className="px-4 py-4 text-xs">{c.uniqueOpenCount} opens<br/>{c.uniqueClickCount} clicks</td><td className="px-4 py-4"><span className="rounded-full bg-[#ffffff08] px-2.5 py-1 text-xs capitalize">{c.status.replace('_',' ')}</span></td></tr>)}</tbody></table></div>
      {!campaigns.length && <p className="py-16 text-center text-sm text-muted-foreground">No communications yet.</p>}
      <div className="flex items-center justify-end gap-2 border-t p-3"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/></button><span className="text-xs">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="rounded border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4"/></button></div>
    </section> : <section className="space-y-3"><div className="flex justify-end"><button onClick={() => setTemplateForm({ name:'', audienceType:'', subject:'', body:'', ctaText:'', ctaUrl:'' })} className="btn-secondary flex items-center gap-2"><Plus className="h-4 w-4"/>Add template</button></div>{templates.map(t => <div key={t.id} className="flex items-center justify-between rounded-lg border bg-card p-4"><div><p className="font-semibold">{t.name}</p><p className="text-sm text-muted-foreground">{t.subject}</p></div><div className="flex gap-2"><button onClick={() => { setForm({...EMPTY,...t,audienceType:t.audienceType || 'users'}); setCompose(true); }} className="text-sm text-primary">Use</button><button onClick={() => setTemplateForm(t)} className="text-sm text-muted-foreground">Edit</button></div></div>)}</section>}
    {compose && <Modal title="Create email campaign" close={() => { setCompose(false); setAudience(null); }}><div className="grid gap-4 sm:grid-cols-2"><Field label="Internal campaign name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Audience"><select value={form.audienceType} onChange={e=>setForm({...form,audienceType:e.target.value,unlockStatus:'',propertyStatus:''})}><option value="users">Users</option><option value="agents">Agents</option></select></Field><Field label="Account status"><select value={form.activityStatus} onChange={e=>setForm({...form,activityStatus:e.target.value})}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></Field><Field label="Location"><input placeholder="State or operating location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></Field>{form.audienceType === 'users' ? <Field label="Property activity"><select value={form.unlockStatus} onChange={e=>setForm({...form,unlockStatus:e.target.value})}><option value="">Any</option><option value="unlocked">Has unlocked</option><option value="never_unlocked">Never unlocked</option></select></Field> : <Field label="Listing activity"><select value={form.propertyStatus} onChange={e=>setForm({...form,propertyStatus:e.target.value})}><option value="">Any</option><option value="active_properties">Active properties</option><option value="no_active_properties">No active properties</option><option value="expired_properties">Expired properties</option></select></Field>}<div className="sm:col-span-2 flex items-center gap-3"><button onClick={preview} className="btn-secondary !py-2">Preview audience</button>{audience && <span className="text-sm font-medium text-primary">{audience.count} recipients matched</span>}</div><Field label="Subject" wide><input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></Field><Field label="Message" wide><textarea rows={7} value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/></Field><Field label="CTA text"><input value={form.ctaText} onChange={e=>setForm({...form,ctaText:e.target.value})}/></Field><Field label="CTA URL"><input type="url" placeholder="https://" value={form.ctaUrl} onChange={e=>setForm({...form,ctaUrl:e.target.value})}/></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.sendNow} onChange={e=>setForm({...form,sendNow:e.target.checked})}/>Send now</label>{!form.sendNow && <Field label="Schedule"><input type="datetime-local" value={form.scheduledAt} onChange={e=>setForm({...form,scheduledAt:e.target.value})}/></Field>}</div><div className="mt-6 flex justify-end"><button disabled={saving || !audience || !form.name || !form.subject || !form.body} onClick={submit} className="btn-primary flex items-center gap-2 disabled:opacity-50"><Send className="h-4 w-4"/>{saving ? 'Saving...' : form.sendNow ? 'Queue campaign' : 'Schedule campaign'}</button></div></Modal>}
    {templateForm && <Modal title={templateForm.id ? 'Edit template' : 'Add template'} close={() => setTemplateForm(null)}><div className="space-y-4"><Field label="Template name"><input value={templateForm.name} onChange={e=>setTemplateForm({...templateForm,name:e.target.value})}/></Field><Field label="Audience"><select value={templateForm.audienceType || ''} onChange={e=>setTemplateForm({...templateForm,audienceType:e.target.value})}><option value="">Any</option><option value="users">Users</option><option value="agents">Agents</option></select></Field><Field label="Subject"><input value={templateForm.subject} onChange={e=>setTemplateForm({...templateForm,subject:e.target.value})}/></Field><Field label="Message"><textarea rows={7} value={templateForm.body} onChange={e=>setTemplateForm({...templateForm,body:e.target.value})}/></Field><button disabled={saving} onClick={saveTemplate} className="btn-primary w-full">Save template</button></div></Modal>}
  </div>;
}

function Field({ label, children, wide=false }: { label:string; children:React.ReactNode; wide?:boolean }) { return <label className={`block text-sm font-medium text-foreground ${wide?'sm:col-span-2':''}`}>{label}<div className="mt-1 [&>input]:w-full [&>input]:rounded-md [&>input]:border [&>input]:border-[#ffffff12] [&>input]:px-3 [&>input]:py-2.5 [&>select]:w-full [&>select]:rounded-md [&>select]:border [&>select]:border-[#ffffff12] [&>select]:px-3 [&>select]:py-2.5 [&>textarea]:w-full [&>textarea]:rounded-md [&>textarea]:border [&>textarea]:border-[#ffffff12] [&>textarea]:px-3 [&>textarea]:py-2.5">{children}</div></label>; }
function Modal({ title, close, children }: { title:string; close:()=>void; children:React.ReactNode }) { return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-card shadow-xl"><div className="sticky top-0 flex items-center justify-between border-b bg-card px-6 py-4"><h2 className="font-display text-lg font-bold">{title}</h2><button onClick={close} aria-label="Close"><X className="h-5 w-5"/></button></div><div className="p-6">{children}</div></div></div>; }
