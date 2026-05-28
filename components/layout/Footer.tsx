"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Youtube, Facebook, Instagram } from "lucide-react";

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.54V6.79a4.85 4.85 0 01-1.02-.1z"/>
  </svg>
);

const FOOTER_LINKS = {
  Platform: [
    { label: "Browse Properties", href: "/properties" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Trust Scores", href: "/#features" },
    { label: "For Agents", href: "/auth/register?role=agent" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Contact Us", href: "/contact" },
    { label: "FAQ", href: "/faq" },
    { label: "Blog", href: "#" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/terms#privacy" },
    { label: "Agent Terms", href: "/terms#agent-terms" },
    { label: "Refund Policy", href: "/terms#refunds" },
  ],
};

const SOCIAL_LINKS = [
  {
    label: "YouTube",
    href: "https://www.youtube.com/@veriqproperty",
    icon: <Youtube className="h-5 w-5" />,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@veriqproperty",
    icon: <TikTokIcon />,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/@veriqproperty",
    icon: <Facebook className="h-5 w-5" />,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/veriqproperty",
    icon: <Instagram className="h-5 w-5" />,
  },
];

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/auth')) return null;

  return (
    <footer className="bg-navy-900 text-white">
      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-veriq-secondary">
                <Shield className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-lg font-bold tracking-tight text-white">Veriq</span>
                <span className="text-[10px] font-semibold tracking-widest uppercase text-gold-400">Property</span>
              </div>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              A trust-focused property intelligence platform helping people make smarter decisions before physical inspections.
            </p>
            <div className="mt-6">
              <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">Follow us</p>
              <div className="flex items-center gap-3">
                {SOCIAL_LINKS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
            {/* PWA Install hint */}
            <div className="mt-6 flex items-center gap-2 rounded-lg bg-white/5 px-4 py-3 border border-white/10">
              <div className="h-8 w-8 rounded-lg bg-veriq-secondary flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Install as App</p>
                <p className="text-[11px] text-slate-500">Add to home screen for the best experience</p>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                {category}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Veriq Property. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="text-xs text-slate-500">
              Know Before You Go<span className="text-gold-500 font-semibold">.</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
