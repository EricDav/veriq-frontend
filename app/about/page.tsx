import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Target, Eye, TrendingUp, Users, CheckCircle, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Veriq Property is a trust-focused property intelligence platform designed to help people make smarter property decisions before physical inspections.",
};

const VALUES = [
  {
    icon: <Shield className="h-6 w-6" />,
    color: "bg-blue-50 text-blue-600",
    title: "Trust First",
    description: "Every feature we build is designed to increase transparency and reduce deception in the property market.",
  },
  {
    icon: <Eye className="h-6 w-6" />,
    color: "bg-purple-50 text-purple-600",
    title: "Verified Intelligence",
    description: "We provide structured, moderated data — not just user-submitted photos that may mislead you.",
  },
  {
    icon: <Target className="h-6 w-6" />,
    color: "bg-emerald-50 text-emerald-600",
    title: "Decision Confidence",
    description: "Our goal is for you to walk into every inspection already knowing whether it's worth your time.",
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    color: "bg-gold-50 text-gold-600",
    title: "Agent Excellence",
    description: "We reward professionalism, accuracy, and responsiveness — not just listing volume.",
  },
];

const PROBLEMS_SOLVED = [
  "Wasted inspections due to misleading listings",
  "Poor disclosure of known property issues",
  "Fake or unavailable listed properties",
  "Unnecessary transportation costs to inspect bad listings",
  "Inability to compare agents by actual performance",
  "No pre-inspection intelligence for renters",
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-hero-pattern pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 right-0 w-96 h-96 rounded-full bg-blue-400/15 blur-3xl translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold text-gold-300 mb-5">
            <Shield className="h-3.5 w-3.5" />
            About Veriq Property
          </div>
          <h1 className="font-display text-5xl font-bold text-white mb-5 leading-tight">
            Building a More Trusted <br />
            <span className="text-gold-400">Property Ecosystem</span>
          </h1>
          <p className="text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">
            We understand the frustrations of the traditional property search process. Veriq Property was built to change it — from the ground up.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 80L1440 80L1440 40C1200 0 800 0 720 40C640 80 240 80 0 40L0 80Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-navy-50 border border-navy-100 px-4 py-1.5 text-xs font-semibold text-navy-700 mb-4">
                Our Mission
              </div>
              <h2 className="section-heading mb-5">
                Know Before <span className="gradient-text">You Go.</span>
              </h2>
              <p className="text-veriq-muted text-base leading-relaxed mb-5">
                Veriq Property is a trust-focused property intelligence platform designed to help people make smarter property decisions <strong className="text-navy-800">before</strong> physical inspections.
              </p>
              <p className="text-veriq-muted text-base leading-relaxed mb-5">
                Instead of functioning as just another listing marketplace, Veriq Property focuses on helping users gain better property decision confidence through structured intelligence, freshness verification, and trust-based agent performance tracking.
              </p>
              <p className="text-veriq-muted text-base leading-relaxed">
                Our mission is to build a more trusted, transparent, and structured property intelligence ecosystem — starting with residential rentals in Nigeria and expanding over time.
              </p>
            </div>

            {/* Problems we solve */}
            <div className="rounded-2xl bg-veriq-surface p-8">
              <h3 className="font-display text-lg font-bold text-navy-900 mb-6">
                Problems We Solve
              </h3>
              <ul className="space-y-3">
                {PROBLEMS_SOLVED.map((problem) => (
                  <li key={problem} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    </div>
                    <span className="text-sm text-navy-700">{problem}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-500 italic">
                  "We reduce these problems through structured property intelligence, freshness verification, trust-based agent performance, and detailed pre-inspection disclosures."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What users can do */}
      <section className="py-20 bg-veriq-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="section-heading mb-4">
              What You Can Do on <span className="gradient-text">Veriq</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: <Eye className="h-5 w-5" />, title: "View Verified Property Previews", desc: "Browse moderated listings with real, accurate visual representation.", color: "text-blue-600 bg-blue-50" },
              { icon: <Shield className="h-5 w-5" />, title: "Unlock Intelligence Reports", desc: "Access detailed property intelligence including environmental and accessibility data.", color: "text-purple-600 bg-purple-50" },
              { icon: <TrendingUp className="h-5 w-5" />, title: "Compare Agent Trust Performance", desc: "See real metrics: response speed, listing accuracy, and inspection success rates.", color: "text-gold-600 bg-gold-50" },
              { icon: <CheckCircle className="h-5 w-5" />, title: "Make Informed Decisions", desc: "Decide whether a property is worth visiting before you ever leave home.", color: "text-emerald-600 bg-emerald-50" },
              { icon: <Users className="h-5 w-5" />, title: "Connect with Trusted Agents", desc: "Work with agents who have verified track records and accountability.", color: "text-indigo-600 bg-indigo-50" },
              { icon: <Target className="h-5 w-5" />, title: "Inspect Smarter", desc: "Walk into every inspection with full context — confident, not guessing.", color: "text-teal-600 bg-teal-50" },
            ].map((item) => (
              <div key={item.title} className="card p-6">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.color} mb-4`}>
                  {item.icon}
                </div>
                <h3 className="font-display text-base font-bold text-navy-900 mb-2">{item.title}</h3>
                <p className="text-sm text-veriq-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="section-heading mb-4">Our Core Values</h2>
            <p className="section-subheading">The principles that guide every decision we make.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((val) => (
              <div key={val.title} className="text-center">
                <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${val.color} mb-5`}>
                  {val.icon}
                </div>
                <h3 className="font-display text-base font-bold text-navy-900 mb-2">{val.title}</h3>
                <p className="text-sm text-veriq-muted leading-relaxed">{val.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-veriq-surface">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-bold text-navy-900 mb-4">
            Join the Smarter Property Movement
          </h2>
          <p className="text-veriq-muted text-base mb-8">
            Whether you're a renter, buyer, or agent — Veriq Property is building the trust infrastructure Nigeria's property market needs.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/properties" className="btn-primary gap-2">
              Browse Properties <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="btn-outline">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
