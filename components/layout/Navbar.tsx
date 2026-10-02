"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

/**
 * The prototype's header carries three links and nothing else: Find a property, Street Intelligence,
 * How it works. Everything that used to sit in the Discover and Company dropdowns is reachable from
 * the footer, which is where the prototype puts it.
 */
const NAV_LINKS = [
  { label: "Find a property", href: "/properties" },
  { label: "Street Intelligence", href: "/street-intelligence" },
  { label: "How it works", href: "/how-it-works" },
];

/**
 * What the drawer lists: the header's three links, then the one or two account actions. The desktop
 * header shows those as buttons; on a phone the prototype makes them the same plain rows.
 */
function mobileLinks(isAuthenticated: boolean) {
  return [
    ...NAV_LINKS,
    isAuthenticated
      ? { label: "Dashboard", href: "/dashboard" }
      : { label: "Log in", href: "/auth/login" },
    { label: "List your property", href: "/auth/register?role=operator" },
  ];
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const isDashboard = pathname.startsWith("/dashboard");
  const darkPropertyHeader = pathname.startsWith("/properties");
  const solidHeader = !darkPropertyHeader && (scrolled || pathname.startsWith("/street-intelligence"));

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const MOBILE_LINKS = mobileLinks(isAuthenticated);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  /*
   * The dashboard has its own workspace header, so the site nav stays out of it. Auth is different:
   * the prototype keeps the site nav on `#login` and `#signup`, and a visitor part-way through signing
   * up still needs a way back to the rest of the site.
   */
  if (isDashboard) return null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        solidHeader
          ? "bg-card backdrop-blur-md shadow-nav"
          : "bg-transparent"
      }`}
    >
      {/*
        The prototype's `.site-nav` is `padding: 22px 5%` with no max-width, so the header runs almost
        edge to edge however wide the window is. Capping it at 1280px here made the bar stop short of
        the window on a large screen, which in turn made every centred panel below it look wider than
        it does in the design.
      */}
      <div className="px-[5%]">
        <div className="flex h-16 items-center justify-between lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background p-1.5 ring-1 ring-white/10">
              <Image src="/images/Logo.png" alt="Veriq Logo" width={36} height={36} className="rounded-lg" />
            </span>
            <div className="flex flex-col leading-none">
              <span className={`font-display text-lg font-bold tracking-tight transition-colors ${solidHeader ? "text-foreground" : "text-foreground"}`}>
                Veriq
              </span>
              <span className={`text-[10px] font-semibold tracking-widest uppercase transition-colors ${solidHeader ? "text-primary" : "text-primary"}`}>
                Property
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? solidHeader
                      ? "bg-[#ffffff08] text-primary font-semibold"
                      : "bg-[#ffffff0f] text-foreground font-semibold"
                    : solidHeader
                    ? "text-foreground hover:bg-[#ffffff08]"
                    : "text-foreground hover:bg-[#ffffff0f]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 btn-primary !py-2 !px-5 !text-sm rounded-lg shadow-sm"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    solidHeader
                      ? "text-foreground hover:text-foreground"
                      : "text-foreground hover:text-foreground"
                  }`}
                >
                  Log in
                </Link>
                <Link
                  href="/auth/register?role=operator"
                  className="btn-primary !py-2 !px-5 !text-sm rounded-lg shadow-sm"
                >
                  List your property <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className={`relative z-[80] rounded-lg p-2 transition-colors lg:hidden ${
              solidHeader ? "text-foreground hover:bg-[#ffffff08]" : "text-foreground hover:bg-[#ffffff0f]"
            }`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu: the prototype slides a panel in from the right over a dimmed page, rather than
          dropping a block under the header. Items are plain text with generous spacing — no icons,
          no boxes. */}
      {mobileOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-[60] bg-[#00000099]"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="mobile-menu"
            aria-label="Main"
            className="fixed inset-y-0 right-0 z-[70] flex w-[82vw] max-w-[360px] flex-col overflow-y-auto border-l border-border bg-background px-9 pb-10 pt-[70px]"
          >
            {MOBILE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="py-[22px] text-[1.05rem] text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
