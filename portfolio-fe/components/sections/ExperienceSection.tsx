"use client";

import React, { useRef, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

// Mock data until API is connected (Req 5.6 — use mock data during P2)
const MOCK_EXPERIENCES = [
  {
    id: "1",
    company: "Tech Startup",
    position: "Senior Full-Stack Developer",
    description:
      "Lead development of scalable web applications serving 10,000+ daily active users. Architected a microservices system with Next.js, NestJS, PostgreSQL, and Redis. Mentored junior developers and established coding standards.",
    startDate: "2024-01",
    endDate: null, // current
    order: 1,
  },
  {
    id: "2",
    company: "Digital Agency",
    position: "Full-Stack Developer",
    description:
      "Built and maintained 8+ client projects across various industries. Specialized in React, Node.js, and AWS deployments. Improved average page load time by 40% through performance optimization.",
    startDate: "2022-06",
    endDate: "2024-01",
    order: 2,
  },
  {
    id: "3",
    company: "Software Consultancy",
    position: "Frontend Developer",
    description:
      "Developed responsive, accessible UI components for enterprise SaaS platforms. Introduced TypeScript and comprehensive testing practices that reduced production bugs by 60%.",
    startDate: "2021-03",
    endDate: "2022-06",
    order: 3,
  },
  {
    id: "4",
    company: "Freelance",
    position: "Web Developer",
    description:
      "Delivered 15+ websites and web apps for small businesses. Handled full project lifecycle from requirements gathering to deployment and maintenance.",
    startDate: "2020-06",
    endDate: "2021-03",
    order: 4,
  },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Present";
  const [year, month] = dateStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

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

        {/* Timeline (Req 11.2 — vertical timeline ordered by order field) */}
        <div className="relative max-w-4xl mx-auto">
          {/* Central vertical line */}
          <div
            className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 timeline-line -translate-x-1/2 rounded-full"
            aria-hidden="true"
          />

          <ol className="flex flex-col gap-10" aria-label="Work experience timeline">
            {MOCK_EXPERIENCES.map((exp, i) => {
              const isLeft = i % 2 === 0;
              const isCurrent = exp.endDate === null;

              return (
                <li key={exp.id}>
                  <RevealWrapper delay={i * 150}>
                    {/* Desktop: alternating left/right. Mobile: always right of line */}
                    <div
                      className={`flex items-start gap-8 md:gap-0 ${
                        isLeft ? "md:flex-row" : "md:flex-row-reverse"
                      }`}
                    >
                      {/* Card — takes 5/12 on desktop */}
                      <div className={`pl-12 md:pl-0 md:w-5/12 ${isLeft ? "md:pr-8" : "md:pl-8"}`}>
                        <GlassCard className={`p-6 group transition-all duration-300 ${isCurrent ? "border-primary/30" : ""}`}>
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors duration-200">
                                {exp.position}
                              </h3>
                              <p className="text-primary text-sm font-semibold mt-0.5">{exp.company}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {isCurrent && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary whitespace-nowrap">
                                  Current
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Date range */}
                          <div className="flex items-center gap-1.5 text-xs text-muted mb-3 font-mono">
                            <svg className="w-3.5 h-3.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <time dateTime={exp.startDate}>{formatDate(exp.startDate)}</time>
                            <span>—</span>
                            <time dateTime={exp.endDate ?? "present"}>{formatDate(exp.endDate)}</time>
                          </div>

                          {/* Description */}
                          <p className="text-muted text-sm leading-relaxed">{exp.description}</p>
                        </GlassCard>
                      </div>

                      {/* Center dot — hidden on mobile (dot is at left instead) */}
                      <div className="hidden md:flex md:w-2/12 justify-center items-start pt-6">
                        <div
                          className={`w-4 h-4 rounded-full border-2 transition-all duration-300 z-10 relative ${
                            isCurrent
                              ? "bg-primary border-primary glow-cyan"
                              : "bg-surface border-primary/60 group-hover:border-primary"
                          }`}
                          aria-hidden="true"
                        />
                      </div>

                      {/* Spacer for alternating side */}
                      <div className="hidden md:block md:w-5/12" />
                    </div>
                  </RevealWrapper>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
