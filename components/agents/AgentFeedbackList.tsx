import { MessageSquare, Star } from 'lucide-react';
import type { AgentFeedback } from '@/types';

export function AgentFeedbackList({ feedback }: { feedback: AgentFeedback[] }) {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold text-navy-900">Agent Ratings & Comments</h2>
        <span className="text-xs font-semibold text-slate-400">
          {feedback.length} comment{feedback.length === 1 ? '' : 's'}
        </span>
      </div>

      {feedback.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center">
          <MessageSquare className="mx-auto mb-2 h-6 w-6 text-slate-300" />
          <p className="text-sm text-slate-500">No rating comments yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-navy-900">{item.reviewerName}</p>
                  {item.propertyTitle && <p className="mt-0.5 text-xs text-slate-400">{item.propertyTitle}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {item.rating !== null && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {item.rating.toFixed(1)}
                    </span>
                  )}
                  {item.ratedAt && (
                    <time className="text-xs text-slate-400" dateTime={item.ratedAt}>
                      {new Date(item.ratedAt).toLocaleDateString()}
                    </time>
                  )}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.comment}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
