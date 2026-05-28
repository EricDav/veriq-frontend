import type { Metadata } from "next";
import { Mail, MessageCircle, Youtube, Facebook, Instagram, Shield, Clock, CheckCircle } from "lucide-react";

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
  { label: "YouTube", href: "https://www.youtube.com/@veriqproperty", icon: <Youtube className="h-5 w-5" />, color: "hover:bg-red-50 hover:text-red-600 hover:border-red-200" },
  { label: "TikTok", href: "https://www.tiktok.com/@veriqproperty", icon: <TikTokIcon />, color: "hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300" },
  { label: "Facebook", href: "https://www.facebook.com/@veriqproperty", icon: <Facebook className="h-5 w-5" />, color: "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" },
  { label: "Instagram", href: "https://www.instagram.com/veriqproperty", icon: <Instagram className="h-5 w-5" />, color: "hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200" },
];

export default function ContactPage() {
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
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold text-gold-300 mb-5">
            <MessageCircle className="h-3.5 w-3.5" />
            Get in Touch
          </div>
          <h1 className="font-display text-5xl font-bold text-white mb-4 leading-tight">
            We&apos;re Here to Help
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Whether you're a property seeker, a listing agent, or just exploring — our team is ready to assist you.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Contact form */}
            <div>
              <h2 className="font-display text-2xl font-bold text-navy-900 mb-2">Send us a Message</h2>
              <p className="text-veriq-muted text-sm mb-8">
                Fill in the form below and we&apos;ll get back to you through our official support channels.
              </p>

              <form className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="label">First Name</label>
                    <input type="text" className="input" placeholder="John" />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input type="text" className="input" placeholder="Doe" />
                  </div>
                </div>

                <div>
                  <label className="label">Email Address</label>
                  <input type="email" className="input" placeholder="john@example.com" />
                </div>

                <div>
                  <label className="label">Phone Number (Optional)</label>
                  <input type="tel" className="input" placeholder="+234 800 000 0000" />
                </div>

                <div>
                  <label className="label">I am a</label>
                  <select className="input">
                    <option value="">Select your role...</option>
                    <option value="renter">Property Seeker / Renter</option>
                    <option value="agent">Real Estate Agent</option>
                    <option value="landlord">Property Owner / Landlord</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="label">Subject</label>
                  <input type="text" className="input" placeholder="How can we help you?" />
                </div>

                <div>
                  <label className="label">Message</label>
                  <textarea
                    className="input min-h-[140px] resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full !py-3.5"
                >
                  Send Message
                </button>

                <p className="text-xs text-slate-400 text-center">
                  By submitting this form, you agree to our{" "}
                  <a href="/terms" className="text-veriq-secondary hover:underline">Terms of Service</a> and{" "}
                  <a href="/terms#privacy" className="text-veriq-secondary hover:underline">Privacy Policy</a>.
                </p>
              </form>
            </div>

            {/* Contact info */}
            <div className="space-y-6">
              {/* Info cards */}
              <div className="card p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900 mb-1">Email Support</h3>
                    <p className="text-sm text-veriq-muted mb-2">
                      Send us an email and we&apos;ll respond through our official support channels.
                    </p>
                    <p className="text-sm font-medium text-veriq-secondary">support@veriqproperty.com</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900 mb-1">Response Time</h3>
                    <p className="text-sm text-veriq-muted mb-2">
                      We aim to respond to all inquiries within 24–48 hours on business days.
                    </p>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs text-emerald-600 font-medium">Monday – Friday, 9am – 6pm WAT</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900 mb-1">Agent Support</h3>
                    <p className="text-sm text-veriq-muted mb-2">
                      For agents with listing disputes, payout queries, or verification issues — use the agent support channel.
                    </p>
                    <p className="text-sm font-medium text-veriq-secondary">agents@veriqproperty.com</p>
                  </div>
                </div>
              </div>

              {/* Social media */}
              <div className="rounded-2xl bg-veriq-surface p-6">
                <h3 className="font-display text-base font-bold text-navy-900 mb-2">Follow & Connect</h3>
                <p className="text-sm text-veriq-muted mb-5">
                  Stay updated with property intelligence tips, platform news, and market insights.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {SOCIAL.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-navy-700 transition-all duration-200 ${s.color}`}
                    >
                      {s.icon}
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Region note */}
              <div className="rounded-2xl bg-navy-900 p-6">
                <p className="text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">Current Operational Focus</p>
                <p className="text-white text-sm leading-relaxed">
                  Veriq Property is currently focused on <strong className="text-gold-400">Port Harcourt, Nigeria</strong>, with plans to expand to other regions. We welcome inquiries from property seekers and agents across Nigeria.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
