import {
  Shield,
  Star,
  FileSearch,
  MapPin,
  TrendingUp,
  Clock,
  CheckCircle,
  Eye,
} from "lucide-react";
import type { SiteContent } from "@/types";

const FEATURES = [
  {
    icon: <Eye className="h-6 w-6" />,
    color: "bg-blue-50 text-blue-600",
    title: "Verified Property Previews",
    description:
      "View curated, moderated previews of every listing. No more surprises — what you see is what the property actually looks like.",
  },
  {
    icon: <FileSearch className="h-6 w-6" />,
    color: "bg-purple-50 text-purple-600",
    title: "Intelligence Reports",
    description:
      "Unlock detailed property reports including environmental data, utility disclosures, accessibility information, and structured inspection insights.",
  },
  {
    icon: <Star className="h-6 w-6" />,
    color: "bg-gold-50 text-gold-600",
    title: "Agent Trust Scores",
    description:
      "Every agent is scored based on listing accuracy, response speed, freshness reliability, and real inspection success rates.",
  },
  {
    icon: <CheckCircle className="h-6 w-6" />,
    color: "bg-emerald-50 text-emerald-600",
    title: "Freshness Verification",
    description:
      "Listings are regularly verified for availability. Stale or unavailable properties are automatically flagged or removed.",
  },
  {
    icon: <MapPin className="h-6 w-6" />,
    color: "bg-red-50 text-red-500",
    title: "Environmental & Accessibility Info",
    description:
      "Access neighbourhood context, flood risk indicators, road access reports, and proximity data before committing to an inspection.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    color: "bg-indigo-50 text-indigo-600",
    title: "Refund Protection",
    description:
      "If a property becomes unavailable after you unlock its report, you may qualify for a credit toward a similar available property.",
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    color: "bg-teal-50 text-teal-600",
    title: "Agent Performance Tracking",
    description:
      "Compare agents side-by-side. Agents who maintain high standards earn better visibility and trust ratings on the platform.",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    color: "bg-orange-50 text-orange-600",
    title: "Auto-Expiring Listings",
    description:
      "Listings automatically expire if not refreshed by the agent, keeping the platform clean, current, and trustworthy.",
  },
];

export function Features({ content }: { content?: SiteContent }) {
  const features = Array.isArray(content?.data?.items)
    ? (content.data.items as Array<{ title: string; description: string }>).map((item, index) => ({
        ...FEATURES[index % FEATURES.length],
        title: item.title,
        description: item.description,
      }))
    : FEATURES;

  return (
    <section id="features" className="py-24 bg-veriq-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-4 py-1.5 text-xs font-semibold text-veriq-secondary mb-4">
            <Shield className="h-3.5 w-3.5" />
            Platform Features
          </div>
          <h2 className="section-heading">
            {content?.title ?? <>Everything you need to <span className="gradient-text">decide with confidence</span></>}
          </h2>
          <p className="section-subheading mt-4">
            {content?.body ?? "Veriq Property isn't just a listings site. It's a full intelligence ecosystem built around helping you make the right decision before you ever leave home."}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="card p-6 group cursor-default"
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${feature.color} mb-5 transition-transform duration-300 group-hover:scale-110`}>
                {feature.icon}
              </div>
              <h3 className="font-display text-base font-bold text-navy-900 mb-2 leading-snug">
                {feature.title}
              </h3>
              <p className="text-sm text-veriq-muted leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
