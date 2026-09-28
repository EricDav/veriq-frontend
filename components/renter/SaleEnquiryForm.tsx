'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle, Send, ShieldCheck } from 'lucide-react';
import { saleListingsApi } from '@/lib/api/renter';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { FieldShell } from '@/components/ui/Select';
import { ApiErrorNotice } from './ApiErrorNotice';

const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;

/**
 * The buyer's only route to a sale listing (Master Blueprint §6). Property for Sale is free to view and carries no
 * unlock fee; Veriq is the buyer contact, so the enquiry reaches the assigned Veriq Agent and the owner's own
 * contact is never shown. An account is not required to enquire.
 */
export function SaleEnquiryForm({
  saleListingId,
  listingTitle,
  agentName,
  note,
}: {
  saleListingId: string;
  listingTitle: string;
  agentName: string | null;
  note: string;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [fieldError, setFieldError] = useState<{ field: 'name' | 'phone' | 'message'; text: string } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldError(null);
    if (name.trim().length < 2) {
      setFieldError({ field: 'name', text: 'Tell us the name Veriq should ask for.' });
      return;
    }
    if (!PHONE_PATTERN.test(phone.trim())) {
      setFieldError({ field: 'phone', text: 'Enter a phone number Veriq can reach you on.' });
      return;
    }
    if (message.trim().length < 10) {
      setFieldError({ field: 'message', text: 'Add a little more about what you would like to know.' });
      return;
    }
    setSending(true);
    try {
      await saleListingsApi.enquire({
        saleListingId,
        name: name.trim(),
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        message: message.trim(),
      });
      setSent(true);
    } catch (err) {
      setError(err);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <section className="card space-y-3 p-5 sm:p-6" aria-live="polite">
        <p className="flex items-center gap-2 font-display text-base font-bold text-emerald-800">
          <CheckCircle className="h-5 w-5 text-emerald-600" /> Enquiry sent to Veriq
        </p>
        <p className="text-sm leading-6 text-slate-600">
          A Veriq Agent will contact you about {listingTitle} on the number you gave us. Veriq handles buyer contact
          for every sale listing, so you will hear from us rather than from the owner.
        </p>
      </section>
    );
  }

  return (
    <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="sale-enquiry-heading">
      <div>
        <h2 id="sale-enquiry-heading" className="font-display text-base font-bold text-navy-900">
          Enquire about this property
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Viewing this listing is free — there is no unlock fee. Send your details and a Veriq Agent will contact you
          {agentName ? `. ${agentName} manages this sale.` : '.'}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldShell
            htmlFor="enquiry-name"
            label="Your name"
            required
            error={fieldError?.field === 'name' ? fieldError.text : undefined}
          >
            <input
              id="enquiry-name"
              className="input"
              maxLength={160}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </FieldShell>
          <FieldShell
            htmlFor="enquiry-phone"
            label="Phone number"
            required
            hint="Veriq calls or messages this number."
            error={fieldError?.field === 'phone' ? fieldError.text : undefined}
          >
            <input
              id="enquiry-phone"
              className="input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </FieldShell>
        </div>
        <FieldShell htmlFor="enquiry-email" label="Email" optional>
          <input
            id="enquiry-email"
            className="input"
            type="email"
            maxLength={255}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FieldShell>
        <FieldShell
          htmlFor="enquiry-message"
          label="What would you like to know?"
          required
          error={fieldError?.field === 'message' ? fieldError.text : undefined}
        >
          <textarea
            id="enquiry-message"
            className="input resize-none"
            rows={4}
            maxLength={2000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="e.g. I would like to arrange a viewing and understand the document position."
          />
        </FieldShell>

        <ApiErrorNotice error={error} fallback="Your enquiry could not be sent. Please try again." />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {note}
          </p>
          <button type="submit" disabled={sending} className="btn-primary flex-shrink-0 !py-2.5">
            {sending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />} Send enquiry
          </button>
        </div>
      </form>
    </section>
  );
}
