"use client";

import React, { useRef, useEffect } from "react";
import { useProjects } from "@/hooks/queries/use-projects";
import { ProjectCarousel } from "@/components/sections/ProjectCarousel";

function RevealWrapper({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
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
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>;
}

export function ProjectsSection() {
  // Req 8.1, 8.2: feed Project data into the carousel.
  const { data: projects, isLoading, isError } = useProjects();

  return (
    <section id="projects" className="py-24 relative" aria-label="Projects section">
      <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="w-[70%] mx-auto">
        {/* Heading — rendered before the carousel so section text never blocks on data (Req 13.1) */}
        <RevealWrapper>
          <div className="flex flex-col items-center text-center mb-16">
            <span className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">My Work</span>
            <h2 className="text-4xl md:text-5xl font-bold">
              Featured <span className="gradient-text">Projects</span>
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-4" />
            <p className="text-muted mt-4 max-w-xl text-sm leading-relaxed">
              A selection of projects I&apos;m proud of — from full-stack web apps to interactive experiences.
            </p>
          </div>
        </RevealWrapper>

        {/* Carousel area — keeps a fixed frame so layout stays intact across states (Req 8.11) */}
        <div className="min-h-[480px] flex items-center justify-center">
          {isError ? (
            // Req 8.11: load failure shows an error message without breaking the layout.
            <div
              role="alert"
              data-testid="projects-error"
              className="glass rounded-2xl border border-border-strong px-8 py-10 max-w-md text-center"
            >
              <p className="text-foreground font-semibold">Couldn&apos;t load projects</p>
              <p className="text-muted text-sm mt-2 leading-relaxed">
                Something went wrong while fetching projects. Please try again later.
              </p>
            </div>
          ) : isLoading ? (
            // Loading placeholder occupies the carousel frame to keep CLS = 0 (Req 13.2).
            <div
              role="status"
              aria-live="polite"
              data-testid="projects-loading"
              className="text-muted text-sm font-mono"
            >
              Loading projects…
            </div>
          ) : !projects || projects.length === 0 ? (
            // Req 8.12: empty-state message when there are no projects to display.
            <p
              role="status"
              data-testid="projects-empty"
              className="text-center text-muted text-sm"
            >
              No projects to display yet. Check back soon.
            </p>
          ) : (
            <ProjectCarousel projects={projects} />
          )}
        </div>
      </div>
    </section>
  );
}
