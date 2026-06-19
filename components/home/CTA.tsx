import Link from "next/link";
import { ArrowRight, Shield, Users } from "lucide-react";
import type { SiteContent } from "@/types";

export function CTA({ content }: { content?: SiteContent }) {
  const cards = Array.isArray(content?.data?.cards)
    ? (content.data.cards as Array<{ title: string; desc: string }>).map((card, index) => ({
        ...[
          { icon: <Shield className="h-5 w-5" />, color: "from-blue-500/20 to-blue-700/20" },
          { icon: <Users className="h-5 w-5" />, color: "from-gold-500/20 to-gold-700/20" },
        ][index % 2],
        ...card,
      }))
    : [
        { icon: <Shield className="h-5 w-5" />, title: "For Property Seekers", desc: "Unlock verified reports and make informed decisions before visiting.", color: "from-blue-500/20 to-blue-700/20" },
        { icon: <Users className="h-5 w-5" />, title: "For Agents", desc: "Build trust, earn better visibility, and attract quality-conscious clients.", color: "from-gold-500/20 to-gold-700/20" },
      ];

  return (
    <section className="py-24 bg-veriq-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-hero-pattern overflow-hidden">
          {/* Decorative */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-gold-500/10 blur-3xl translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-blue-400/10 blur-3xl -translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative grid grid-cols-1 gap-8 p-10 lg:p-16 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold text-gold-300 mb-5">
                Get Started Today
              </div>
              <h2 className="font-display text-4xl font-bold text-white mb-4 leading-tight">
                {content?.title ?? "Ready to inspect smarter?"}
              </h2>
              <p className="text-white/70 text-base leading-relaxed mb-8">
                {content?.body ?? "Join thousands of property seekers and agents building a more transparent, trustworthy property experience in Nigeria."}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/properties"
                  className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-7 py-3.5 text-sm font-bold text-navy-900 shadow-gold-glow transition-all duration-200 hover:scale-105"
                >
                  Browse Properties
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/auth/register?role=agent"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10"
                >
                  <Users className="h-4 w-4" />
                  Join as Agent
                </Link>
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {cards.map((card) => (
                <div
                  key={card.title}
                  className={`rounded-2xl bg-gradient-to-br ${card.color} border border-white/10 p-5 backdrop-blur-sm`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white mb-4">
                    {card.icon}
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1.5">{card.title}</h3>
                  <p className="text-white/60 text-xs leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
