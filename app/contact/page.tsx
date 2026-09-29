import type { Metadata } from "next";
import { Mail, MessageCircle, Youtube, Facebook, Instagram, Shield, Clock, CheckCircle } from "lucide-react";
import { getPublicPageContent } from "@/lib/site-content";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the Veriq Property team. We're here to help with property questions, agent support, and platform inquiries.",
};

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.54V6.79a4.85 4.85 0 01-1.02-.1z"/>
  </svg>
);

const SOCIAL = [
  { label: "YouTube", href: "https://www.youtube.com/@veriqproperty", icon: <Youtube className="h-5 w-5" />, color: "hover:bg-[#fb718510] hover:text-destructive hover:border-[#fb718530]" },
  { label: "TikTok", href: "https://www.tiktok.com/@veriqproperty", icon: <TikTokIcon />, color: "hover:bg-[#ffffff0d] hover:text-foreground hover:border-[#ffffff12]" },
  { label: "Facebook", href: "https://www.facebook.com/@veriqproperty", icon: <Facebook className="h-5 w-5" />, color: "hover:bg-[#ffffff08] hover:text-muted-foreground hover:border-[#ffffff12]" },
  { label: "Instagram", href: "https://www.instagram.com/veriqproperty", icon: <Instagram className="h-5 w-5" />, color: "hover:bg-[#ffffff08] hover:text-muted-foreground hover:border-[#ffffff12]" },
];

export default async function ContactPage() {
  const content = await getPublicPageContent("contact");
  const hero = content.hero;
  const formIntro = content.form_intro;
  const support = content.support;
  const agentSupport = content.agent_support;
  const socialContent = content.social;
  const operations = content.operations;
  const supportData = (support?.data ?? {}) as {
    supportEmail?: string;
    agentEmail?: string;
    responseTime?: string;
    businessHours?: string;
  };
  const agentSupportData = (agentSupport?.data ?? {}) as { agentEmail?: string };
  const socialLinks = Array.isArray(socialContent?.data?.links)
    ? (socialContent.data.links as Array<{ label: string; href: string }>).map((item) => ({
        ...(SOCIAL.find((social) => social.label === item.label) ?? SOCIAL[0]),
        label: item.label,
        href: item.href,
      }))
    : SOCIAL;

  return (
    <>
      {/* Hero */}
      <section className="bg-hero-pattern pt-32 pb-20 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 80L1440 80L1440 40C1200 0 800 0 720 40C640 80 240 80 0 40L0 80Z" fill="white" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ffffff0f] border border-white/20 px-4 py-1.5 text-xs font-semibold text-primary mb-5">
            <MessageCircle className="h-3.5 w-3.5" />
            Get in Touch
          </div>
          <h1 className="font-display text-5xl font-bold text-foreground mb-4 leading-tight">
            {hero?.title ?? "We're Here to Help"}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {hero?.subtitle ?? "Whether you're a property seeker, a listing agent, or just exploring — our team is ready to assist you."}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Contact form */}
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">{formIntro?.title ?? "Send us a Message"}</h2>
              <p className="text-muted-foreground text-sm mb-8">
                {formIntro?.body ?? "Fill in the form below and we'll get back to you through our official support channels."}
              </p>

              <ContactForm />
            </div>

            {/* Contact info */}
            <div className="space-y-6">
              {/* Info cards */}
              <div className="card p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[#ffffff08] flex items-center justify-center text-muted-foreground flex-shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{support?.title ?? "Email Support"}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {support?.body ?? "Send us an email and we'll respond through our official support channels."}
                    </p>
                    <p className="text-sm font-medium text-primary">{supportData.supportEmail ?? "support@veriqproperty.com"}</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[#10b98112] flex items-center justify-center text-primary flex-shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Response Time</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {supportData.responseTime ?? "We aim to respond to all inquiries within 24-48 hours on business days."}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span className="text-xs text-primary font-medium">{supportData.businessHours ?? "Monday – Friday, 9am – 6pm WAT"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[#ffffff08] flex items-center justify-center text-muted-foreground flex-shrink-0">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{agentSupport?.title ?? "Agent Support"}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {agentSupport?.body ?? "For agents with listing disputes, payout queries, or verification issues — use the agent support channel."}
                    </p>
                    <p className="text-sm font-medium text-primary">{agentSupportData.agentEmail ?? supportData.agentEmail ?? "agents@veriqproperty.com"}</p>
                  </div>
                </div>
              </div>

              {/* Social media */}
              <div className="rounded-2xl bg-background p-6">
                <h3 className="font-display text-base font-bold text-foreground mb-2">{socialContent?.title ?? "Follow & Connect"}</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  {socialContent?.body ?? "Stay updated with property intelligence tips, platform news, and market insights."}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {socialLinks.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2.5 rounded-xl border border-[#ffffff12] bg-card px-4 py-3 text-sm font-medium text-foreground transition-all duration-200 ${s.color}`}
                    >
                      {s.icon}
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Region note */}
              <div className="rounded-2xl bg-background p-6">
                <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-2">Current Operational Focus</p>
                <p className="text-foreground text-sm leading-relaxed">
                  {operations?.body ?? (
                    <>
                      Veriq Property is currently focused on <strong className="text-primary">Port Harcourt, Nigeria</strong>, with plans to expand to other regions. We welcome inquiries from property seekers and agents across Nigeria.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
