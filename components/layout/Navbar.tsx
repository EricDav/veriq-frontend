"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, LayoutDashboard } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { label: "Properties", href: "/properties" },
  { label: "Blog", href: "/blog" },
  {
    label: "Company",
    href: "#",
    children: [
      { label: "About Us", href: "/about" },
      { label: "FAQ", href: "/faq" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const isDashboard = pathname.startsWith("/dashboard");
  const isAuthPage = pathname.startsWith("/auth");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(null);
  }, [pathname]);

  if (isDashboard || isAuthPage) return null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-nav"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-950 p-1.5 ring-1 ring-white/10">
              <Image src="/images/Logo.png" alt="Veriq Logo" width={36} height={36} className="rounded-lg" />
            </span>
            <div className="flex flex-col leading-none">
              <span className={`font-display text-lg font-bold tracking-tight transition-colors ${scrolled ? "text-navy-900" : "text-white"}`}>
                Veriq
              </span>
              <span className={`text-[10px] font-semibold tracking-widest uppercase transition-colors ${scrolled ? "text-gold-600" : "text-gold-400"}`}>
                Property
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) =>
              link.children ? (
                <div key={link.label} className="relative">
                  <button
                    onMouseEnter={() => setDropdownOpen(link.label)}
                    onMouseLeave={() => setDropdownOpen(null)}
                    className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      scrolled
                        ? "text-navy-700 hover:text-navy-900 hover:bg-slate-50"
                        : "text-white/90 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {link.label}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropdownOpen === link.label ? "rotate-180" : ""}`} />
                  </button>
                  {dropdownOpen === link.label && (
                    <div
                      onMouseEnter={() => setDropdownOpen(link.label)}
                      onMouseLeave={() => setDropdownOpen(null)}
                      className="absolute top-full left-0 pt-2"
                    >
                      <div className="min-w-[200px] rounded-xl bg-white shadow-card-hover border border-slate-100 py-1.5 overflow-hidden">
                        {link.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="block px-4 py-2.5 text-sm text-navy-700 hover:bg-slate-50 hover:text-veriq-secondary transition-colors"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? scrolled
                        ? "bg-slate-50 text-veriq-secondary font-semibold"
                        : "bg-white/10 text-white font-semibold"
                      : scrolled
                      ? "text-navy-700 hover:text-navy-900 hover:bg-slate-50"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              )
            )}
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
                    scrolled
                      ? "text-navy-700 hover:text-navy-900"
                      : "text-white/90 hover:text-white"
                  }`}
                >
                  Log in
                </Link>
                <Link
                  href="/auth/register"
                  className="btn-primary !py-2 !px-5 !text-sm rounded-lg shadow-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className={`lg:hidden rounded-lg p-2 transition-colors ${
              scrolled ? "text-navy-800 hover:bg-slate-100" : "text-white hover:bg-white/10"
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
        <div className="lg:hidden bg-white border-t border-slate-100 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) =>
              link.children ? (
                <div key={link.label}>
                  <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {link.label}
                  </div>
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="block rounded-lg px-4 py-2.5 text-sm text-navy-700 hover:bg-slate-50 hover:text-veriq-secondary transition-colors"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-slate-50 hover:text-veriq-secondary transition-colors"
                >
                  {link.label}
                </Link>
              )
            )}
            <div className="pt-3 pb-1 border-t border-slate-100 flex flex-col gap-2">
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
                  <Link href="/auth/register" className="btn-primary w-full !py-2.5">
                    Get Started
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
