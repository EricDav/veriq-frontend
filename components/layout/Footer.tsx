"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, Youtube, Facebook, Instagram } from "lucide-react";
import Image from "next/image";

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.54V6.79a4.85 4.85 0 01-1.02-.1z"/>
  </svg>
);

/**
 * The prototype's three columns — Explore, Veriq, Here to help. This product has pages the prototype
 * does not, so each one is folded into the column it belongs to rather than dropped.
 */
const FOOTER_LINKS = {
  Explore: [
    { label: "Find a property", href: "/properties" },
    { label: "Street Intelligence", href: "/street-intelligence" },
    { label: "Shared Property", href: "/shared" },
    { label: "Property for Sale", href: "/for-sale" },
    { label: "List your property", href: "/auth/register?role=operator" },
  ],
  Veriq: [
    { label: "About us", href: "/about" },
    { label: "How it works", href: "/how-it-works" },
    { label: "The Veriq Journal", href: "/blog" },
    { label: "Contact", href: "/contact" },
    { label: "For Agents", href: "/auth/register?role=agent" },
  ],
  "Here to help": [
    { label: "FAQs", href: "/faq" },
    { label: "Refund policy", href: "/refund-policy" },
    { label: "Safety guide", href: "/safety" },
    { label: "Verification rules", href: "/verification-rules" },
  ],
};

/** The legal links the prototype puts on the bottom bar rather than in a column. */
const LEGAL_LINKS = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Operator terms", href: "/operator-terms" },
];

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

  const openInstallPrompt = () => {
    window.dispatchEvent(new Event('veriq:open-install-prompt'));
  };

  return (
    <footer className="border-t border-border bg-background text-muted-foreground">
      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background p-1.5 ring-1 ring-white/10">
                <Image src="/images/Logo.png" alt="Veriq Logo" width={36} height={36} className="rounded-lg" />
              </span>
              <div className="flex flex-col leading-none">
                <span className="font-display text-lg font-bold tracking-tight text-foreground">Veriq</span>
                <span className="text-[10px] font-semibold tracking-widest uppercase text-primary">Property</span>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Know the property. Understand the street.<br />
              Make your next move with clarity.
            </p>
            <div className="mt-6">
              <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-semibold">Follow us</p>
              <div className="flex items-center gap-3">
                {SOCIAL_LINKS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ffffff06] text-muted-foreground transition-all duration-200 hover:bg-[#ffffff0f] hover:text-foreground"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
            {/* PWA Install hint */}
            <button
              type="button"
              onClick={openInstallPrompt}
              className="mt-6 flex w-full max-w-xs items-center gap-2 rounded-lg border border-input bg-[#ffffff06] px-4 py-3 text-left transition-colors hover:bg-[#ffffff0f]"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-background p-1.5 ring-1 ring-white/10">
                <Image src="/images/Logo.png" alt="Veriq Logo" width={32} height={32} className="rounded-md" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">Install as App</p>
                <p className="text-[11px] text-muted-foreground">Add to home screen for the best experience</p>
              </div>
              <Download className="ml-auto h-4 w-4 text-primary" />
            </button>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="mb-4 font-display text-sm font-semibold text-foreground">
                {category}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
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
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Veriq Global Services Ltd.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-5">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
