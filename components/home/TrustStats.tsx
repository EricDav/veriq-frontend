import { CheckCircle2, ListChecks, Quote, ShieldCheck, Sparkles } from 'lucide-react';
import type { SiteContent } from '@/types';

const PROOF = [
  { icon: ListChecks, title: 'What you can verify', items: ['Verified ownership', 'Availability reconfirmation', 'Structured inspection info'] },
  { icon: Sparkles, title: 'Trust signals', items: ['Freshness badges', 'Trust score & performance', 'Mandated preview content'] },
  { icon: ShieldCheck, title: 'What users gain', items: ['Fewer wasted inspections', 'More confident decisions', 'Better agent transparency'] },
];

type Testimonial = { quote: string; name: string; role?: string; initials: string };

function getTestimonials(content?: SiteContent): Testimonial[] {
  const source = content?.data?.testimonials;
  if (!Array.isArray(source)) return [];

  return source.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const item = value as Record<string, unknown>;
    const quote = typeof item.quote === 'string' ? item.quote.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!quote || !name) return [];
    const role = typeof item.role === 'string' ? item.role.trim() : '';
    const suppliedInitials = typeof item.initials === 'string' ? item.initials.trim() : '';
    const initials = suppliedInitials || name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return [{ quote, name, role: role || undefined, initials }];
  });
}

export function TrustStats({ content }: { content?: SiteContent }) {
  const testimonials = getTestimonials(content);
  return (
    <section className="bg-background py-16 text-foreground sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-black">Built for smarter property decisions</h2>
          <p className="mt-3 text-sm text-muted-foreground">Veriq brings transparency and structure to the property search process.</p>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {PROOF.map(({ icon: Icon, title, items }) => (
            <div key={title} className="rounded-lg border border-white/10 bg-card/[0.05] p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold"><Icon className="h-4 w-4 text-primary" />{title}</h3>
              <ul className="mt-4 space-y-2">
                {items.map((item) => <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-primary" />{item}</li>)}
              </ul>
            </div>
          ))}
        </div>

        {testimonials.length > 0 && (
          <div className="mt-12">
            <div className="text-center">
              <h2 className="font-display text-2xl font-black">{content?.title || 'What our users say'}</h2>
              {content?.subtitle && <p className="mt-2 text-sm text-muted-foreground">{content.subtitle}</p>}
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {testimonials.map((item, index) => (
                <figure key={`${item.name}-${index}`} className="rounded-lg border border-white/10 bg-card/[0.05] p-5">
                  <Quote className="h-5 w-5 fill-primary text-primary" />
                  <blockquote className="mt-3 text-sm leading-6 text-muted-foreground">“{item.quote}”</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-foreground">{item.initials}</div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{item.name}</p>
                      {item.role && <p className="text-xs text-muted-foreground">{item.role}</p>}
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
