'use client';

import type { ContactInput, ContactType, SchemaIssue } from '@/types/operator';

export interface ContactValue {
  contactType: ContactType;
  name: string;
  phone: string;
  whatsappPhone: string;
}

export const EMPTY_CONTACT: ContactValue = { contactType: 'operator', name: '', phone: '', whatsappPhone: '' };

const PHONE = /^\+?[0-9]{10,15}$/;
const cleanPhone = (value: string) => value.replace(/[\s()-]/g, '');

/** Mirrors ContactDto validation. Returns `contact.*` issues when invalid. */
export function toContactInput(value: ContactValue, prefix = 'contact'): { contact: ContactInput | null; issues: SchemaIssue[] } {
  const issues: SchemaIssue[] = [];
  const name = value.name.trim();
  const phone = cleanPhone(value.phone);
  const whatsapp = cleanPhone(value.whatsappPhone);
  if (name.length < 2 || name.length > 200) issues.push({ path: `${prefix}.name`, message: 'Enter the contact name (2–200 characters)' });
  if (!PHONE.test(phone)) issues.push({ path: `${prefix}.phone`, message: 'Enter a valid phone number, e.g. +2348012345678' });
  if (whatsapp && !PHONE.test(whatsapp)) issues.push({ path: `${prefix}.whatsappPhone`, message: 'Enter a valid WhatsApp number' });
  if (issues.length) return { contact: null, issues };
  return {
    contact: { contactType: value.contactType, name, phone, ...(whatsapp ? { whatsappPhone: whatsapp } : {}) },
    issues,
  };
}

interface ContactFieldsProps {
  value: ContactValue;
  onChange: (value: ContactValue) => void;
  issues?: SchemaIssue[];
  prefix?: string;
  /** Residential landlords may name a caretaker; Short Let, Hostel and Shared contexts may also use an operator contact. */
  allowCaretaker?: boolean;
  idPrefix: string;
  disabled?: boolean;
}

export function ContactFields({ value, onChange, issues = [], prefix = 'contact', allowCaretaker = true, idPrefix, disabled }: ContactFieldsProps) {
  const messages = (key: string) => issues.filter((issue) => issue.path === `${prefix}.${key}`).map((issue) => issue.message);
  const error = (key: string) =>
    messages(key).map((message) => (
      <p key={message} className="mt-1 text-xs font-medium text-red-600">{message}</p>
    ));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {allowCaretaker && (
        <div className="sm:col-span-2">
          <span className="label">Who should renters reach after unlock?</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['operator', 'caretaker'] as ContactType[]).map((type) => (
              <label
                key={type}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${value.contactType === type ? 'border-veriq-secondary bg-emerald-50' : 'border-slate-200'}`}
              >
                <input
                  type="radio"
                  name={`${idPrefix}-contact-type`}
                  className="mt-1"
                  checked={value.contactType === type}
                  disabled={disabled}
                  onChange={() => onChange({ ...value, contactType: type })}
                />
                <span>
                  <span className="block font-semibold text-navy-900">{type === 'operator' ? 'Me (the Operator)' : 'Caretaker / property contact'}</span>
                  <span className="text-xs text-slate-500">
                    {type === 'operator'
                      ? 'Renters contact you directly.'
                      : 'A replaceable contact with no Veriq login. You stay the account holder.'}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-contact-name`} className="label">Contact name <span className="text-red-500">*</span></label>
        <input id={`${idPrefix}-contact-name`} className="input" maxLength={200} disabled={disabled} value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
        {error('name')}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-contact-phone`} className="label">Phone number <span className="text-red-500">*</span></label>
        <input id={`${idPrefix}-contact-phone`} className="input" type="tel" inputMode="tel" placeholder="+2348012345678" disabled={disabled} value={value.phone} onChange={(event) => onChange({ ...value, phone: event.target.value })} />
        {error('phone')}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-contact-whatsapp`} className="label">WhatsApp number <span className="text-xs font-normal text-slate-400">Optional — defaults to phone</span></label>
        <input id={`${idPrefix}-contact-whatsapp`} className="input" type="tel" inputMode="tel" placeholder="+2348012345678" disabled={disabled} value={value.whatsappPhone} onChange={(event) => onChange({ ...value, whatsappPhone: event.target.value })} />
        {error('whatsappPhone')}
      </div>
    </div>
  );
}
