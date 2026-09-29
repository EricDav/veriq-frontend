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

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const isDashboard = pathname.startsWith("/dashboard");
  const isAuthPage = pathname.startsWith("/auth");
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

  if (isDashboard || isAuthPage) return null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        solidHeader
          ? "bg-card backdrop-blur-md shadow-nav"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
            className={`lg:hidden rounded-lg p-2 transition-colors ${
              solidHeader ? "text-foreground hover:bg-[#ffffff08]" : "text-foreground hover:bg-[#ffffff0f]"
            }`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-card border-t border-[#ffffff12] shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-[#ffffff08] hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 pb-1 border-t border-[#ffffff12] flex flex-col gap-2">
              {isAuthenticated ? (
                <Link href="/dashboard" className="btn-primary w-full !py-2.5 flex items-center justify-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/auth/login" className="btn-outline w-full !py-2.5">
                    Log in
                  </Link>
                  <Link href="/auth/register?role=operator" className="btn-primary w-full !py-2.5">
                    List your property
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
