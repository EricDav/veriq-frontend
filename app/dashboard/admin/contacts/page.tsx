'use client';

import React, { useEffect, useState } from 'react';
import { Mail, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { contactSubmissionsApi, ApiError } from '@/lib/api';
import type { ContactSubmission, ContactSubmissionStatus } from '@/types';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

const STATUS_STYLE: Record<ContactSubmissionStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  read: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function AdminContactsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<ContactSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role !== UserRole.ADMIN) router.push('/dashboard');
  }, [authLoading, user, router]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await contactSubmissionsApi.list(1, 100);
      setItems(res.data);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to load contact submissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === UserRole.ADMIN) load();
  }, [authLoading, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (id: string, status: ContactSubmissionStatus) => {
    setUpdatingId(id);
    try {
      const res = await contactSubmissionsApi.update(id, status);
      setItems((prev) => prev.map((item) => (item.id === id ? res.data : item)));
      success('Contact submission updated');
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to update submission');
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.ADMIN) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-navy-900">Contact Form Submissions</h1>
          </div>
          <p className="text-sm text-veriq-muted">Review messages submitted from the public contact page.</p>
        </div>
        <button onClick={load} className="btn-primary !py-2.5 !text-sm flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><LoadingSpinner size="lg" className="text-veriq-secondary" /></div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <Mail className="mx-auto mb-4 h-10 w-10 text-slate-300" />
          <h2 className="font-display text-lg font-bold text-navy-900">No submissions yet</h2>
          <p className="mt-1 text-sm text-veriq-muted">Contact form messages will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`badge text-[10px] ${STATUS_STYLE[item.status]}`}>{item.status}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5" /> {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-navy-900">{item.subject}</h2>
                  <p className="mt-1 text-sm text-veriq-muted">
                    {item.firstName} {item.lastName} · <a href={`mailto:${item.email}`} className="text-veriq-secondary hover:underline">{item.email}</a>
                    {item.phone ? <> · <a href={`tel:${item.phone}`} className="text-veriq-secondary hover:underline">{item.phone}</a></> : null}
                  </p>
                  {item.role && <p className="mt-1 text-xs capitalize text-slate-400">Role: {item.role}</p>}
                  <p className="mt-4 whitespace-pre-wrap rounded-xl bg-veriq-surface p-4 text-sm leading-relaxed text-navy-800">{item.message}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:flex-col">
                  {(['new', 'read', 'resolved'] as ContactSubmissionStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={updatingId === item.id || item.status === status}
                      onClick={() => updateStatus(item.id, status)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold capitalize text-navy-700 hover:border-veriq-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingId === item.id && item.status !== status ? <LoadingSpinner size="sm" /> : status}
                    </button>
                  ))}
                  <a href={`mailto:${item.email}?subject=Re: ${encodeURIComponent(item.subject)}`} className="btn-primary !px-3 !py-2 !text-xs flex items-center justify-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5" /> Reply
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
