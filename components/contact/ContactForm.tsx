'use client';

import React, { useState } from 'react';
import { contactSubmissionsApi, ApiError } from '@/lib/api';
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

export function ContactForm() {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await contactSubmissionsApi.create({
        ...form,
        phone: form.phone.trim() || undefined,
        role: form.role || undefined,
      });
      setForm(initialForm);
      success('Message sent. Our team will review it and respond soon.');
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to send message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="label">First Name</label>
          <input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} type="text" className="input" placeholder="John" required minLength={2} />
        </div>
        <div>
          <label className="label">Last Name</label>
          <input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} type="text" className="input" placeholder="Doe" required minLength={2} />
        </div>
      </div>

      <div>
        <label className="label">Email Address</label>
        <input value={form.email} onChange={(e) => update('email', e.target.value)} type="email" className="input" placeholder="john@example.com" required />
      </div>

      <div>
        <label className="label">Phone Number (Optional)</label>
        <input value={form.phone} onChange={(e) => update('phone', e.target.value)} type="tel" className="input" placeholder="+234 800 000 0000" />
      </div>

      <div>
        <label className="label">I am a</label>
        <select value={form.role} onChange={(e) => update('role', e.target.value)} className="input">
          <option value="">Select your role...</option>
          <option value="renter">Property Seeker / Renter</option>
          <option value="agent">Real Estate Agent</option>
          <option value="landlord">Property Owner / Landlord</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="label">Subject</label>
        <input value={form.subject} onChange={(e) => update('subject', e.target.value)} type="text" className="input" placeholder="How can we help you?" required minLength={3} />
      </div>

      <div>
        <label className="label">Message</label>
        <textarea
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          className="input min-h-[140px] resize-none"
          placeholder="Tell us more about your inquiry..."
          required
          minLength={10}
        />
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full !py-3.5 flex items-center justify-center gap-2">
        {isSubmitting && <LoadingSpinner size="sm" />}
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>

      <p className="text-xs text-slate-400 text-center">
        By submitting this form, you agree to our{' '}
        <a href="/terms" className="text-veriq-secondary hover:underline">Terms of Service</a> and{' '}
        <a href="/privacy" className="text-veriq-secondary hover:underline">Privacy Policy</a>.
      </p>
    </form>
  );
}
