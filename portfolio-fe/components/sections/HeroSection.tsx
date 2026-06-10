"use client";

import React, { useEffect, useReducer, useRef } from "react";
import { HeroSceneDynamic } from "@/components/three";

// ─── Mock data ────────────────────────────────────────────────────────────────
const HERO_DATA = {
  name: "Trương Việt",
  title: "Full-Stack Developer",
  subtitles: [
    "I build premium web experiences.",
    "React & Next.js specialist.",
    "3D interactive interfaces.",
    "TypeScript enthusiast.",
  ],
  ctaProjects: "View Projects",
  ctaCV: "Download CV",
  socials: [
    { label: "GitHub",   href: "https://github.com",   icon: "github"   },
    { label: "LinkedIn", href: "https://linkedin.com", icon: "linkedin" },
    { label: "Twitter",  href: "https://twitter.com",  icon: "twitter"  },
  ],
};

// ─── Typing animation (useReducer — no synchronous setState in effect) ────────

type TypingPhase = "typing" | "deleting";
type TypingState  = { currentIdx: number; displayed: string; phase: TypingPhase };
type TypingAction =
  | { type: "TYPE";         char: string  }
  | { type: "START_DELETE"               }
  | { type: "DELETE_CHAR"               }
  | { type: "ADVANCE";      total: number };

function typingReducer(state: TypingState, action: TypingAction): TypingState {
  switch (action.type) {
    case "TYPE":         return { ...state, displayed: state.displayed + action.char, phase: "typing"   };
    case "START_DELETE": return { ...state, phase: "deleting"                                          };
    case "DELETE_CHAR":  return { ...state, displayed: state.displayed.slice(0, -1)                    };
    case "ADVANCE":      return { currentIdx: (state.currentIdx + 1) % action.total, displayed: "", phase: "typing" };
    default:             return state;
  }
}

function TypingText({ texts }: { texts: string[] }) {
  const [state, dispatch] = useReducer(typingReducer, {
    currentIdx: 0,
    displayed:  "",
    phase:      "typing" as TypingPhase,
  });

  useEffect(() => {
    const current = texts[state.currentIdx];
    let id: ReturnType<typeof setTimeout>;

    if (state.phase === "typing" && state.displayed.length < current.length) {
      id = setTimeout(() => dispatch({ type: "TYPE", char: current[state.displayed.length] }), 60);
    } else if (state.phase === "typing" && state.displayed.length === current.length) {
      id = setTimeout(() => dispatch({ type: "START_DELETE" }), 2000);
    } else if (state.phase === "deleting" && state.displayed.length > 0) {
      id = setTimeout(() => dispatch({ type: "DELETE_CHAR" }), 35);
    } else if (state.phase === "deleting" && state.displayed.length === 0) {
      id = setTimeout(() => dispatch({ type: "ADVANCE", total: texts.length }), 100);
    }

    return () => clearTimeout(id);
  }, [state, texts]);

  return (
    <span className="text-primary">
      {state.displayed}
      <span className="animate-pulse" aria-hidden="true">|</span>
    </span>
  );
}

// ─── Grid overlay (pure CSS, SSR-safe) ───────────────────────────────────────

function GridOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
      style={{
        backgroundImage:
          "linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px), " +
          "linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}
    />
  );
}

// ─── Stat badge ───────────────────────────────────────────────────────────────

function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass rounded-xl px-4 py-3 flex flex-col items-center gap-0.5 border border-border hover:border-primary/30 transition-colors duration-300">
      <span className="text-2xl font-bold gradient-text">{value}</span>
      <span className="text-xs text-muted font-medium">{label}</span>
    </div>
  );
}

// ─── Social icon ─────────────────────────────────────────────────────────────

function SocialIcon({ name }: { name: string }) {
  if (name === "github") return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  );
  if (name === "linkedin") return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const handleScroll = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-label="Hero section"
    >
      {/* ── 3D scene as full-bleed background ── */}
      <HeroSceneDynamic />

      {/* ── Subtle grid on top of 3D ── */}
      <GridOverlay />

      {/* ── Content (z-10 so it sits above canvas) ── */}
      <div className="relative z-10 w-[75%] mx-auto pt-28 pb-20">
        <div className="flex flex-col gap-8 w-full">

          {/* Status badge */}
          <div className="inline-flex w-fit items-center gap-2 px-4 py-2 glass rounded-full border border-primary/20 text-sm text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            Available for hire
          </div>

          {/* Headings */}
          <div className="flex flex-col gap-3">
            <p className="text-muted text-lg font-medium tracking-wide">
              Hi there 👋 I&apos;m
            </p>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="gradient-text-blue">{HERO_DATA.name}</span>
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground/90">
              {HERO_DATA.title}
            </h2>
            <div className="text-xl md:text-2xl font-medium min-h-[2rem]">
              <TypingText texts={HERO_DATA.subtitles} />
            </div>
          </div>

          <p className="text-muted text-lg leading-relaxed max-w-[60%]">
            Passionate about crafting pixel-perfect, performant web applications
            with modern technologies. Specialized in React, Next.js, Node.js,
            and interactive 3D experiences.
          </p>

          {/* CTA */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => handleScroll("#projects")}
              className="group px-7 py-3.5 rounded-full bg-gradient-to-r from-primary to-primary-strong text-background font-semibold text-base hover:opacity-90 transition-all duration-300 glow-cyan"
            >
              <span className="flex items-center gap-2">
                {HERO_DATA.ctaProjects}
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </button>
            <a
              href="/cv.pdf"
              download
              className="px-7 py-3.5 rounded-full glass border border-border-strong font-semibold text-base text-foreground hover:border-primary/40 hover:text-primary transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {HERO_DATA.ctaCV}
              </span>
            </a>
          </div>

          {/* Social links */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted font-medium uppercase tracking-widest">Follow me</span>
            <div className="flex-1 h-px bg-border" />
            <div className="flex gap-3">
              {HERO_DATA.socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 glass rounded-full flex items-center justify-center text-muted hover:text-primary hover:border-primary/30 transition-all duration-200 border border-border"
                >
                  <SocialIcon name={s.icon} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
          <StatBadge value="3+"   label="Years Experience" />
          <StatBadge value="20+"  label="Projects Built"   />
          <StatBadge value="15+"  label="Technologies"     />
          <StatBadge value="100%" label="Dedication"       />
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce" aria-hidden="true">
          <span className="text-xs text-muted">Scroll down</span>
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </section>
  );
}
