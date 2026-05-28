import { Shield, Users, CheckCircle, Star, TrendingUp, Clock } from "lucide-react";

const STATS = [
  { icon: <CheckCircle className="h-6 w-6" />, value: "2,400+", label: "Verified Listings", color: "text-emerald-500" },
  { icon: <Users className="h-6 w-6" />, value: "480+", label: "Trusted Agents", color: "text-blue-500" },
  { icon: <Star className="h-6 w-6" />, value: "94%", label: "Inspection Success", color: "text-gold-500" },
  { icon: <Shield className="h-6 w-6" />, value: "₦0", label: "Fraud Losses", color: "text-purple-500" },
];

const TESTIMONIALS = [
  {
    quote:
      "Before Veriq, I wasted 3 weekends inspecting properties that weren't what the photos showed. Now I only go when I'm confident.",
    name: "Chika O.",
    role: "Renter, Port Harcourt",
    avatar: "C",
    avatarColor: "bg-blue-500",
  },
  {
    quote:
      "As an agent, my trust score has helped me stand out. Clients come to me already informed — inspections are faster and more successful.",
    name: "Emmanuel A.",
    role: "Founding Verified Agent",
    avatar: "E",
    avatarColor: "bg-emerald-500",
  },
  {
    quote:
      "The environmental report showed me the area had flooding issues. I would never have known without Veriq. Saved me from a bad decision.",
    name: "Tunde M.",
    role: "Property Seeker",
    avatar: "T",
    avatarColor: "bg-purple-500",
  },
];

export function TrustStats() {
  return (
    <section className="py-24 bg-navy-900 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-veriq-secondary/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-gold-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4 mb-20">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 ${stat.color} mb-4 mx-auto`}>
                {stat.icon}
              </div>
              <div className="text-4xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold text-white mb-3">
            Trusted by Nigerians Making Smarter Property Decisions
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            Real experiences from people who chose to inspect smarter.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-gold-400 fill-gold-400" />
                ))}
              </div>

              <p className="text-white/80 text-sm leading-relaxed mb-5 italic">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full ${t.avatarColor} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{t.name}</p>
                  <p className="text-slate-500 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
