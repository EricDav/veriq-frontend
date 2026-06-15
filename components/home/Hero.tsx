import Link from "next/link";
import { ArrowRight, CheckCircle, Search, Shield, Star } from "lucide-react";
import type { SiteContent } from "@/types";

const TRUST_POINTS = [
  "Verified property previews",
  "Agent trust scores & ratings",
  "Pre-inspection intelligence reports",
];

export function Hero({ content }: { content?: SiteContent }) {
  const title = content?.title ?? "Know Before You Go.";
  const [titleStart, titleHighlight, titleEnd] =
    title === "Know Before You Go."
      ? ["Know", "Before", "You Go."]
      : [title, "", ""];
  const trustPoints = Array.isArray(content?.data?.trustPoints)
    ? (content.data.trustPoints as string[])
    : TRUST_POINTS;

  return (
    <section className="relative min-h-screen bg-hero-pattern overflow-hidden flex items-center">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/10 via-transparent to-navy-950/70" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-28 pb-20 lg:pt-36 lg:pb-28">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          {/* Left — Copy */}
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm text-gold-300 font-medium mb-6 backdrop-blur-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" />
              Property Intelligence Platform
            </div>

            <h1 className="font-display text-5xl font-bold text-white leading-tight tracking-tight md:text-6xl lg:text-[68px]">
              {titleHighlight ? (
                <>
                  {titleStart} <span className="relative"><span className="text-gold-400">{titleHighlight}</span></span> {titleEnd}
                </>
              ) : titleStart}
            </h1>

            <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-xl">
              {content?.body ?? "Stop wasting time on misleading listings and pointless inspections. Veriq Property gives you verified property intelligence — so you inspect smarter."}
            </p>

            {/* Trust points */}
            <ul className="mt-6 space-y-2.5">
              {trustPoints.map((point) => (
                <li key={point} className="flex items-center gap-3 text-white/80 text-sm">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-400 flex-shrink-0" />
                  {point}
                </li>
              ))}
            </ul>

            {/* CTA buttons */}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/properties"
                className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-7 py-3.5 text-sm font-bold text-navy-900 shadow-gold-glow transition-all duration-200 hover:scale-105 hover:shadow-xl"
              >
                Browse Properties
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm px-7 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10"
              >
                Learn How It Works
              </Link>
            </div>
          </div>

          {/* Right — Dashboard card mockup */}
          <div className="relative hidden lg:block">
            <div className="relative ml-auto max-w-md">
              {/* Glow */}
              <div className="absolute inset-0 rounded-3xl bg-veriq-secondary/30 blur-2xl scale-105" />

              {/* Main card */}
              <div className="relative rounded-3xl bg-white/10 border border-white/20 backdrop-blur-xl overflow-hidden shadow-2xl">
                <div className="px-6 pt-6 pb-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-veriq-secondary flex items-center justify-center">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-white font-semibold text-sm">Property Intelligence</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400 text-xs font-medium">Verified</span>
                    </div>
                  </div>
                </div>

                {/* Search bar */}
                <div className="px-6 py-4">
                  <div className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/10 px-4 py-3">
                    <Search className="h-4 w-4 text-white/40" />
                    <span className="text-white/40 text-sm">Search Port Harcourt properties...</span>
                  </div>
                </div>

                {/* Property cards */}
                {[
                  { name: "3-Bed Apartment, GRA", price: "₦250,000/mo", trust: 96, verified: true, tag: "Available" },
                  { name: "2-Bed Flat, Trans Amadi", price: "₦150,000/mo", trust: 88, verified: true, tag: "Hot" },
                  { name: "Studio, Rumuola", price: "₦80,000/mo", trust: 92, verified: false, tag: "New" },
                ].map((prop, i) => (
                  <div key={i} className="mx-6 mb-3 rounded-xl bg-white/5 border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white text-sm font-medium">{prop.name}</p>
                        <p className="text-gold-400 text-xs font-semibold mt-0.5">{prop.price}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          prop.tag === "Hot"
                            ? "bg-red-500/20 text-red-300"
                            : prop.tag === "New"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {prop.tag}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-gold-400 fill-gold-400" />
                        <span className="text-white/60 text-xs">Trust {prop.trust}%</span>
                      </div>
                      {prop.verified && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400 text-xs">Verified Listing</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="px-6 pb-6">
                  <div className="rounded-xl bg-gold-gradient px-4 py-3 text-center">
                    <p className="text-navy-900 text-sm font-bold">Unlock Intelligence Report</p>
                    <p className="text-navy-700 text-xs mt-0.5">Get full details before you visit</p>
                  </div>
                </div>
              </div>

              {/* Floating stats */}
              <div className="absolute -bottom-4 -left-8 rounded-2xl bg-white shadow-card-hover p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Verified Listings</p>
                  <p className="text-lg font-bold text-navy-900">2,400+</p>
                </div>
              </div>

              <div className="absolute -top-4 -right-4 rounded-2xl bg-white shadow-card-hover p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Trusted Agents</p>
                  <p className="text-lg font-bold text-navy-900">480+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 80L1440 80L1440 40C1200 0 800 0 720 40C640 80 240 80 0 40L0 80Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}
