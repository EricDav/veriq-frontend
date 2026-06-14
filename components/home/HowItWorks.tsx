import { Search, Unlock, MapPin, CheckCircle } from "lucide-react";
import type { SiteContent } from "@/types";

const STEPS = [
  {
    number: "01",
    icon: <Search className="h-7 w-7" />,
    title: "Browse Verified Listings",
    description:
      "Explore our curated pool of properties. Filter by location, price, type, and trust score to find exactly what fits your needs.",
    color: "from-blue-500 to-blue-700",
    lightColor: "bg-blue-50 text-blue-700",
  },
  {
    number: "02",
    icon: <Unlock className="h-7 w-7" />,
    title: "Unlock Intelligence Report",
    description:
      "Pay a small consultation fee to unlock the full property intelligence report — detailed images, disclosures, environmental data, and agent contact.",
    color: "from-gold-500 to-gold-700",
    lightColor: "bg-gold-50 text-gold-700",
  },
  {
    number: "03",
    icon: <CheckCircle className="h-7 w-7" />,
    title: "Compare & Decide",
    description:
      "Review the full report, check the agent's trust score and performance history, then decide whether the property is worth inspecting.",
    color: "from-purple-500 to-purple-700",
    lightColor: "bg-purple-50 text-purple-700",
  },
  {
    number: "04",
    icon: <MapPin className="h-7 w-7" />,
    title: "Inspect with Confidence",
    description:
      "Walk into your inspection fully informed — no surprises, no wasted trips. If the property isn't as listed, you're protected.",
    color: "from-emerald-500 to-emerald-700",
    lightColor: "bg-emerald-50 text-emerald-700",
  },
];

export function HowItWorks({ content }: { content?: SiteContent }) {
  const steps = Array.isArray(content?.data?.steps)
    ? (content.data.steps as Array<{ title: string; description: string }>).map((item, index) => ({
        ...STEPS[index % STEPS.length],
        title: item.title,
        description: item.description,
      }))
    : STEPS;

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-end mb-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-navy-50 border border-navy-100 px-4 py-1.5 text-xs font-semibold text-navy-700 mb-4">
              Simple Process
            </div>
            <h2 className="section-heading">
              {content?.title ?? <>How Veriq <br className="hidden lg:block" /><span className="gradient-text">Property Works</span></>}
            </h2>
          </div>
          <p className="section-subheading lg:max-w-sm">
            {content?.body ?? "From discovery to inspection — a smarter, more informed journey every step of the way."}
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-slate-200 to-transparent z-0 -ml-4" />
              )}

              <div className="relative z-10">
                {/* Step number */}
                <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-white shadow-lg mb-5`}>
                  {step.icon}
                </div>

                <div className="absolute top-0 right-0 text-5xl font-black text-slate-100 leading-none select-none">
                  {step.number}
                </div>

                <h3 className="font-display text-lg font-bold text-navy-900 mb-3 leading-snug">
                  {step.title}
                </h3>
                <p className="text-sm text-veriq-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
