"use client";

import React, { useRef, useEffect } from "react";
import { useExperiences } from "@/hooks/queries/use-experiences";
import { ExperienceTimeline } from "@/components/sections/ExperienceTimeline";

function RevealWrapper({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add("is-visible"), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);
  return <div ref={ref} className="reveal">{children}</div>;
}

export function ExperienceSection() {
  const { data: experiences, isLoading, isError } = useExperiences();

  return (
    <section id="experience" className="py-24 relative" aria-label="Work experience section">
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Heading */}
        <RevealWrapper>
          <div className="flex flex-col items-center text-center mb-16">
            <span className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Career Path</span>
            <h2 className="text-4xl md:text-5xl font-bold">
              Work <span className="gradient-text">Experience</span>
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-4" />
            <p className="text-muted mt-4 max-w-xl text-sm leading-relaxed">
              My professional journey through various companies and roles that shaped my expertise.
            </p>
          </div>
        </RevealWrapper>

        {/* Timeline — fed by useExperiences() (Req 9.1, 9.2, 9.11) */}
        {isLoading ? (
          <p
            data-testid="experience-loading"
            className="text-center text-muted text-sm py-12"
            role="status"
            aria-live="polite"
          >
            Loading experience…
          </p>
        ) : isError ? (
          <p
            data-testid="experience-error"
            className="text-center text-muted text-sm py-12"
            role="alert"
          >
            Unable to load work experience right now. Please try again later.
          </p>
        ) : (
          <ExperienceTimeline experiences={experiences ?? []} />
        )}
      </div>
    </section>
  );
}
