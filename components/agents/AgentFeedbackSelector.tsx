'use client';

import { Check } from 'lucide-react';
import { AgentFeedbackTag } from '@/types';

const GROUPS = [
  {
    label: 'What went well',
    options: [
      [AgentFeedbackTag.CLEAR_AND_HELPFUL, 'Clear and Helpful'],
      [AgentFeedbackTag.DETAILED_INFORMATION, 'Detailed Information'],
      [AgentFeedbackTag.HELPFUL_PHOTOS, 'Helpful Photos'],
      [AgentFeedbackTag.INFORMATION_LOOKED_ACCURATE, 'Information Looked Accurate'],
    ] as const,
  },
  {
    label: 'Could Be Improved',
    options: [
      [AgentFeedbackTag.MORE_DETAILS_NEEDED, 'More Details Needed'],
      [AgentFeedbackTag.BETTER_PHOTOS_NEEDED, 'More/Better Photos Needed'],
      [AgentFeedbackTag.INTELLIGENCE_COULD_BE_MORE_ACCURATE, 'Intelligence Could Be More Accurate'],
    ] as const,
  },
] as const;

export const AGENT_FEEDBACK_LABELS: Record<AgentFeedbackTag, string> = {
  [AgentFeedbackTag.CLEAR_AND_HELPFUL]: 'Clear and Helpful',
  [AgentFeedbackTag.DETAILED_INFORMATION]: 'Detailed Information',
  [AgentFeedbackTag.HELPFUL_PHOTOS]: 'Helpful Photos',
  [AgentFeedbackTag.INFORMATION_LOOKED_ACCURATE]: 'Information Looked Accurate',
  [AgentFeedbackTag.MORE_DETAILS_NEEDED]: 'More Details Needed',
  [AgentFeedbackTag.BETTER_PHOTOS_NEEDED]: 'More/Better Photos Needed',
  [AgentFeedbackTag.INTELLIGENCE_COULD_BE_MORE_ACCURATE]: 'Intelligence Could Be More Accurate',
};

export function AgentFeedbackSelector({ value, onChange }: {
  value: AgentFeedbackTag[];
  onChange: (value: AgentFeedbackTag[]) => void;
}) {
  const toggle = (tag: AgentFeedbackTag) => {
    if (value.includes(tag)) {
      onChange(value.filter((item) => item !== tag));
    } else if (value.length < 2) {
      onChange([...value, tag]);
    }
  };

  return (
    <fieldset>
      <div className="mb-3 flex items-center justify-between gap-3">
        <legend className="text-sm font-bold text-navy-900">Select feedback <span className="font-normal text-slate-500">(up to 2)</span></legend>
        <span className="text-xs font-bold text-veriq-secondary" aria-live="polite">{value.length}/2 selected</span>
      </div>
      <div className="space-y-4">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-xs font-semibold text-slate-500">{group.label}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.options.map(([tag, label]) => {
                const selected = value.includes(tag);
                const disabled = value.length >= 2 && !selected;
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() => toggle(tag)}
                    className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                      selected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45'
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
