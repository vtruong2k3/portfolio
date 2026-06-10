"use client";

import React, { useEffect, useRef, useState } from "react";

interface NavLink {
  href: string;
  label: string;
}

const navLinks: NavLink[] = [
  { href: "#hero", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#skills", label: "Skills" },
  { href: "#projects", label: "Projects" },
  { href: "#experience", label: "Experience" },
  { href: "#contact", label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lang, setLang] = useState<"vi" | "en">("vi");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = navLinks.map((l) => l.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { threshold: 0.3, rootMargin: "-20% 0px -60% 0px" }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "glass py-3" : "py-5"
      }`}
      role="banner"
    >
      <nav
        className="max-w-6xl mx-auto px-6 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <a
          href="#hero"
          onClick={(e) => { e.preventDefault(); handleNavClick("#hero"); }}
          className="relative group flex items-center gap-2"
          aria-label="Go to top"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-background">
            &lt;/&gt;
          </div>
          <span className="font-bold text-lg tracking-tight gradient-text">
            devfolio
          </span>
        </a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-1" role="list">
          {navLinks.map((link) => {
            const id = link.href.slice(1);
            const isActive = activeSection === id;
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? "text-primary"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <span
                      className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative">{link.label}</span>
                </a>
              </li>
            );
          })}
        </ul>

        {/* Right: lang switcher + CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            aria-label={`Switch to ${lang === "vi" ? "English" : "Vietnamese"}`}
            className="px-3 py-1.5 text-xs font-semibold rounded-full glass border border-border-strong text-muted hover:text-foreground hover:border-primary/30 transition-all duration-200"
          >
            {lang === "vi" ? "🇬🇧 EN" : "🇻🇳 VI"}
          </button>
          <a
            href="#contact"
            onClick={(e) => { e.preventDefault(); handleNavClick("#contact"); }}
            className="px-4 py-2 text-sm font-semibold rounded-full bg-gradient-to-r from-primary to-primary-strong text-background hover:opacity-90 transition-all duration-200 glow-cyan"
          >
            Hire Me
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden relative w-10 h-10 flex flex-col items-center justify-center gap-1.5"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label="Toggle navigation menu"
        >
          <span
            className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${
              mobileOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${
              mobileOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${
              mobileOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`md:hidden glass border-t border-border transition-all duration-300 overflow-hidden ${
          mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
        aria-hidden={!mobileOpen}
      >
        <ul className="flex flex-col px-6 py-4 gap-1" role="list">
          {navLinks.map((link) => {
            const id = link.href.slice(1);
            const isActive = activeSection === id;
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-primary bg-primary/10 border border-primary/20"
                      : "text-muted hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
          <li className="pt-2 border-t border-border mt-2">
            <button
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              {lang === "vi" ? "🇬🇧 Switch to English" : "🇻🇳 Chuyển sang Tiếng Việt"}
            </button>
          </li>
        </ul>
      </div>
    </header>
  );
}
