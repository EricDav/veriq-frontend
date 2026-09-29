'use client';

import { useState, type FormEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { contactSubmissionsApi, ApiError } from '@/lib/api';
import { Button, FieldShell, Select } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: '',
  subject: '',
  message: '',
};

/**
 * The prototype's enquiry form is a stub with two fields and no submission. This one posts to the real
 * contact-submission endpoint, so it keeps the fields that endpoint requires — restyled onto the
 * prototype's field grammar (label above control, 22px stack, one full-width action).
 *
 * Role is optional and starts blank on its placeholder, per Master Blueprint §4 and §7.
 */
const ROLE_OPTIONS = [
  { value: 'renter', label: 'Renter or buyer' },
  { value: 'operator', label: 'Property Operator' },
  { value: 'other', label: 'Something else' },
] as const;

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
      await contactSubmissionsApi.create({
        ...form,
        phone: form.phone.trim() || undefined,
        role: form.role || undefined,
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
    <form onSubmit={submit} className="mt-5 space-y-[22px]">
      <div className="grid gap-[22px] sm:grid-cols-2">
        <FieldShell htmlFor="contact-first-name" label="First name" required>
          <input
            id="contact-first-name"
            name="firstName"
            type="text"
            autoComplete="given-name"
            className="input"
            value={form.firstName}
            onChange={(event) => update('firstName', event.target.value)}
            required
            minLength={2}
          />
        </FieldShell>
        <FieldShell htmlFor="contact-last-name" label="Last name" required>
          <input
            id="contact-last-name"
            name="lastName"
            type="text"
            autoComplete="family-name"
            className="input"
            value={form.lastName}
            onChange={(event) => update('lastName', event.target.value)}
            required
            minLength={2}
          />
        </FieldShell>
      </div>

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

      <FieldShell htmlFor="contact-phone" label="Phone number" optional>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className="input"
          value={form.phone}
          onChange={(event) => update('phone', event.target.value)}
        />
      </FieldShell>

      <Select
        id="contact-role"
        name="role"
        label="I am a"
        placeholder="Select…"
        optional
        options={ROLE_OPTIONS}
        value={form.role}
        onValueChange={(value) => update('role', value)}
      />

      <FieldShell htmlFor="contact-subject" label="Subject" required>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          className="input"
          value={form.subject}
          onChange={(event) => update('subject', event.target.value)}
          required
          minLength={3}
        />
      </FieldShell>

      <FieldShell htmlFor="contact-message" label="How can we help?" required>
        <textarea
          id="contact-message"
          name="message"
          className="input min-h-[132px] resize-y"
          value={form.message}
          onChange={(event) => update('message', event.target.value)}
          required
          minLength={10}
        />
      </FieldShell>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <LoadingSpinner size="sm" /> : null}
        {isSubmitting ? 'Sending…' : 'Send enquiry'}
        {isSubmitting ? null : <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
      </Button>

      <p className="text-center text-xs leading-[1.6] text-muted-foreground">
        By sending this enquiry you agree to our{' '}
        <a href="/terms" className="font-medium text-primary hover:underline">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="font-medium text-primary hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
