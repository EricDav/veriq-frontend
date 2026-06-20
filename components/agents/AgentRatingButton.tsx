'use client';

import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { agentsApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

interface AgentRatingButtonProps {
  propertyId: string;
  propertyTitle?: string;
  className?: string;
}

export function AgentRatingButton({ propertyId, propertyTitle, className }: AgentRatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [inspectionOccurred, setInspectionOccurred] = useState(true);
  const [accuracyScore, setAccuracyScore] = useState(100);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await agentsApi.recordInspectionOutcome({
        propertyId,
        inspectionOccurred,
        accuracyScore,
        satisfactionRating: rating,
        comment: comment.trim() || undefined,
      });
      success('Thanks. Your agent rating has been recorded.');
      setIsOpen(false);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Unable to submit rating.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={className ?? 'btn-outline !py-2.5 !text-sm flex items-center justify-center gap-2'}
      >
        <Star className="h-4 w-4" /> Rate Agent
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/50 px-4 py-6">
          <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gold-600">Agent rating</p>
                <h3 className="font-display text-lg font-black text-navy-900">
                  {propertyTitle ?? 'Property report'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Close rating dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-navy-900">How would you rate this agent?</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-100 hover:bg-gold-50"
                      aria-label={`Rate ${value} out of 5`}
                    >
                      <Star className={`h-5 w-5 ${value <= rating ? 'fill-gold-500 text-gold-500' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-sm font-semibold text-navy-800">
                <input
                  type="checkbox"
                  checked={inspectionOccurred}
                  onChange={(e) => setInspectionOccurred(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-veriq-secondary"
                />
                Physical inspection happened
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-navy-900">Listing accuracy</label>
                  <span className="text-sm font-black text-veriq-secondary">{accuracyScore}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={accuracyScore}
                  onChange={(e) => setAccuracyScore(Number(e.target.value))}
                  className="w-full accent-veriq-secondary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-navy-900">Comment</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 500))}
                  rows={4}
                  className="input min-h-28 resize-y"
                  placeholder="Share how responsive, honest, or helpful the agent was."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setIsOpen(false)} className="btn-outline !py-2.5">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary !py-2.5 disabled:opacity-60">
                {isSubmitting ? <LoadingSpinner size="sm" /> : 'Submit rating'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
