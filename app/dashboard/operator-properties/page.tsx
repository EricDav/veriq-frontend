'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { shortLetOperatorsApi } from '@/lib/api';
import { ListingStatus, Property, UserRole } from '@/types';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
export default function OperatorPropertiesPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isPropertyOperator = user?.role === UserRole.PROPERTY_OPERATOR;
  const [items, setItems] = useState<Property[]>([]); const { success, error } = useToast();
  // Property Operators manage submissions, Units, media and availability in the Operator portal (§30.2).
  useEffect(() => { if (isPropertyOperator) router.replace('/dashboard/operator/properties'); }, [isPropertyOperator, router]);
  const load = () => shortLetOperatorsApi.portalListings().then((r) => setItems(r.data)).catch((e) => error(e.message));
  useEffect(() => { if (!isLoading && !isPropertyOperator) void load(); }, [isLoading, isPropertyOperator]);
  const availability = async (item: Property) => { try { await shortLetOperatorsApi.availability(item.id, item.status !== ListingStatus.ACTIVE); success('Availability updated'); void load(); } catch (e: any) { error(e.message); } };
  if (isLoading || isPropertyOperator) return <PageLoader />;
  return <div className="mx-auto max-w-5xl space-y-6"><div><h1 className="font-display text-2xl font-bold">My Short Let Properties</h1><p className="text-sm text-veriq-muted">Manage associated units, pricing, media and availability.</p></div><div className="overflow-hidden rounded-lg border bg-white">{items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No properties are associated with this operator.</p> : items.map((item) => <div key={item.id} className="flex flex-col gap-4 border-b p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{item.title}</p><p className="text-xs text-slate-500">{item.area}, {item.city} · <span className="capitalize">{item.status}</span></p></div><div className="flex gap-2"><button className="btn-outline !py-2" onClick={() => availability(item)}>{item.status === ListingStatus.ACTIVE ? 'Mark unavailable' : 'Mark available'}</button><Link className="btn-primary !py-2" href={`/dashboard/operator-properties/${item.id}`}>Manage</Link></div></div>)}</div></div>;
}
