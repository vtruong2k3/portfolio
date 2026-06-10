"use client";

import React, { useRef, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

const ABOUT_DATA = {
  bio: [
    "I'm a passionate Full-Stack Developer with 3+ years of experience building high-quality web applications. I specialize in creating beautiful, performant, and accessible digital experiences.",
    "My journey began with a curiosity about how things work on the web, and evolved into a deep expertise in modern web technologies. I love working at the intersection of design and engineering.",
    "When I'm not coding, you'll find me exploring new technologies, contributing to open source, or sharing knowledge with the community.",
  ],
  timeline: [
    {
      year: "2024 – Present",
      role: "Senior Full-Stack Developer",
      company: "Tech Startup",
      description: "Leading development of large-scale web applications with Next.js, NestJS, and PostgreSQL.",
      current: true,
    },
    {
      year: "2022 – 2024",
      role: "Full-Stack Developer",
      company: "Digital Agency",
      description: "Built and maintained multiple client projects using React, Node.js, and various cloud services.",
      current: false,
    },
    {
      year: "2021 – 2022",
      role: "Frontend Developer",
      company: "Startup",
      description: "Developed responsive UIs with React and TypeScript, focusing on user experience and performance.",
      current: false,
    },
  ],
  skills_highlight: ["Next.js", "React", "TypeScript", "NestJS", "PostgreSQL", "Prisma", "Docker", "AWS"],
};

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

  return (
    <div ref={ref} className="reveal">
      {children}
    </div>
  );
}

export function AboutSection() {
  return (
    <section id="about" className="py-24 relative" aria-label="About me section">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section heading */}
        <RevealWrapper>
          <div className="flex flex-col items-center text-center mb-16">
            <span className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Who I Am</span>
            <h2 className="text-4xl md:text-5xl font-bold">
              About <span className="gradient-text">Me</span>
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-4" />
          </div>
        </RevealWrapper>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Bio card */}
          <RevealWrapper delay={100}>
            <GlassCard className="p-8 h-full">
              <div className="flex flex-col gap-6">
                {/* Avatar placeholder */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-background shrink-0">
                    TV
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Trương Việt</h3>
                    <p className="text-primary text-sm font-medium">Full-Stack Developer</p>
                    <p className="text-muted text-xs mt-0.5">📍 Vietnam</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {ABOUT_DATA.bio.map((para, i) => (
                    <p key={i} className="text-muted leading-relaxed text-sm">
                      {para}
                    </p>
                  ))}
                </div>

                {/* Key tech badges */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {ABOUT_DATA.skills_highlight.map((skill) => (
                    <span key={skill} className="tech-badge">{skill}</span>
                  ))}
                </div>

                {/* Contact info */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-primary">📧</span>
                    <span className="text-muted">dev@example.com</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-primary">🌐</span>
                    <span className="text-muted">Available worldwide</span>
                  </div>
                </div>

                <a
                  href="/cv.pdf"
                  download
                  className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 text-foreground font-semibold text-sm hover:from-primary/30 hover:to-accent/30 transition-all duration-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Resume
                </a>
              </div>
            </GlassCard>
          </RevealWrapper>

          {/* Right: Timeline */}
          <RevealWrapper delay={200}>
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-semibold mb-6 text-foreground">Career Timeline</h3>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 timeline-line rounded-full" aria-hidden="true" />

                <div className="flex flex-col gap-6 pl-12">
                  {ABOUT_DATA.timeline.map((item, i) => (
                    <RevealWrapper key={i} delay={300 + i * 100}>
                      <div className="relative group">
                        {/* Dot */}
                        <div
                          className={`absolute -left-12 top-1 w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                            item.current
                              ? "bg-primary border-primary glow-cyan"
                              : "bg-surface border-primary/50 group-hover:border-primary"
                          }`}
                          aria-hidden="true"
                        />

                        <GlassCard className={`p-5 transition-all duration-300 ${item.current ? "border-primary/30" : ""}`}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h4 className="font-semibold text-foreground text-sm">{item.role}</h4>
                              <p className="text-primary text-xs font-medium mt-0.5">{item.company}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs text-muted bg-surface-2 px-2 py-1 rounded-full whitespace-nowrap">
                                {item.year}
                              </span>
                              {item.current && (
                                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-muted text-xs leading-relaxed">{item.description}</p>
                        </GlassCard>
                      </div>
                    </RevealWrapper>
                  ))}
                </div>
              </div>
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  );
}
