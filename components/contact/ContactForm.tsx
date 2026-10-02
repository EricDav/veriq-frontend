'use client';

import { useState, type FormEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { contactSubmissionsApi, ApiError } from '@/lib/api';
import { Button, FieldShell } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

const initialForm = { name: '', email: '', message: '' };

/**
 * The prototype's enquiry form asks two things: your email and how we can help. This posts to the real
 * contact endpoint, which also requires a name and a subject, so it adds one name field and files
 * every enquiry under the form's own name. Nothing is invented on the sender's behalf.
 */
export function ContactForm() {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const [firstName, ...rest] = form.name.trim().split(/\s+/);
      await contactSubmissionsApi.create({
        firstName,
        // The endpoint requires both parts; a one-word name repeats rather than inventing a surname.
        lastName: rest.join(' ') || firstName,
        email: form.email,
        subject: 'General enquiry',
        message: form.message,
      });
      setForm(initialForm);
      success('Enquiry sent. Our team will review it and respond soon.');
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Could not send your enquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-[22px] flex flex-col gap-[22px]">
      <FieldShell htmlFor="contact-name" label="Your name" required>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          className="input"
          value={form.name}
          onChange={(event) => update('name', event.target.value)}
          required
          minLength={2}
        />
      </FieldShell>

      <FieldShell htmlFor="contact-email" label="Your email" required>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          className="input"
          value={form.email}
          onChange={(event) => update('email', event.target.value)}
          required
        />
      </FieldShell>

      <FieldShell htmlFor="contact-message" label="How can we help?" required>
        <textarea
          id="contact-message"
          name="message"
          className="input min-h-[110px] resize-y"
          value={form.message}
          onChange={(event) => update('message', event.target.value)}
          required
          minLength={10}
        />
      </FieldShell>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <LoadingSpinner size="sm" /> : null}
        {isSubmitting ? 'Sending…' : 'Send enquiry'}
        {isSubmitting ? null : <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
      </Button>
    </form>
  );
}
