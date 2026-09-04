'use client';
import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { shortLetOperatorsApi } from '@/lib/api';
import { OperatorPortalStatus, ShortLetOperator } from '@/types';
import { useToast } from '@/components/ui/Toast';

export default function AgentShortLetOperatorsPage() {
  const [items, setItems] = useState<ShortLetOperator[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);
  const { success, error } = useToast();
  const load = () => shortLetOperatorsApi.approved().then((r) => setItems(r.data)).catch((e) => error(e.message));
  useEffect(() => { void load(); }, []);
  const manageAccess = async (item: ShortLetOperator) => {
    try {
      const email = emails[item.id] || item.email || '';
      const response = item.portalStatus === OperatorPortalStatus.NOT_CREATED ? await shortLetOperatorsApi.provision(item.id, email) : await shortLetOperatorsApi.reset(item.id);
      setCredential({ email, password: response.data.temporaryPassword });
      success('Operator access updated'); void load();
    } catch (e: any) { error(e.message); }
  };
  return <div className="mx-auto max-w-5xl space-y-6"><div><h1 className="font-display text-2xl font-bold">Short Let Operators</h1><p className="text-sm text-veriq-muted">Provision restricted access for approved operators linked to your listings.</p></div>{credential && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm"><p className="font-semibold">Temporary login details</p><p>Email: <strong>{credential.email}</strong></p><p>Password: <strong>{credential.password}</strong></p><p className="mt-1 text-xs">Share securely. This password is shown only now.</p></div>}<div className="overflow-hidden rounded-lg border bg-white">{items.map((item) => <div key={item.id} className="grid gap-4 border-b p-5 last:border-0 md:grid-cols-[1.5fr_1fr_auto] md:items-end"><div><p className="font-semibold">{item.name}</p><p className="text-xs text-slate-500">{item.phone} · {item.portalStatus.replace('_', ' ')}</p></div><label><span className="label">Portal email</span><input className="input" type="email" disabled={item.portalStatus !== OperatorPortalStatus.NOT_CREATED} value={emails[item.id] ?? item.email ?? ''} onChange={(e) => setEmails({ ...emails, [item.id]: e.target.value })} /></label><button className="btn-outline flex items-center gap-2" onClick={() => manageAccess(item)}><KeyRound className="h-4 w-4" />{item.portalStatus === OperatorPortalStatus.NOT_CREATED ? 'Create access' : 'Reset access'}</button></div>)}</div></div>;
}
