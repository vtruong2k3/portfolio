"use client";

import React, { useRef, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { SkillsOrbitSceneDynamic } from "@/components/three";

const SKILLS_DATA = [
  {
    category: "Frontend",
    color: "from-primary to-primary-strong",
    skills: [
      { name: "React / Next.js", level: 95, icon: "⚛️" },
      { name: "TypeScript", level: 90, icon: "📘" },
      { name: "Tailwind CSS", level: 92, icon: "🎨" },
      { name: "Three.js / R3F", level: 75, icon: "🎲" },
      { name: "Framer Motion", level: 80, icon: "🌀" },
    ],
  },
  {
    category: "Backend",
    color: "from-accent to-accent-strong",
    skills: [
      { name: "NestJS / Node.js", level: 88, icon: "🚀" },
      { name: "PostgreSQL", level: 85, icon: "🐘" },
      { name: "Prisma ORM", level: 87, icon: "△" },
      { name: "REST / GraphQL", level: 82, icon: "🔗" },
      { name: "Redis", level: 70, icon: "🔴" },
    ],
  },
  {
    category: "DevOps & Tools",
    color: "from-primary-strong to-accent",
    skills: [
      { name: "Docker", level: 80, icon: "🐳" },
      { name: "AWS / Vercel", level: 75, icon: "☁️" },
      { name: "Git / GitHub", level: 93, icon: "🐙" },
      { name: "CI/CD", level: 72, icon: "⚙️" },
      { name: "Linux", level: 78, icon: "🐧" },
    ],
  },
];

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

function SkillBar({ name, level, icon, color, delay }: {
  name: string;
  level: number;
  icon: string;
  color: string;
  delay: number;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.width = `${level}%`;
          }, delay + 300);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [level, delay]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">{icon}</span>
          <span className="text-sm font-medium text-foreground">{name}</span>
        </div>
        <span className="text-xs text-muted font-mono">{level}%</span>
      </div>
      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden" role="progressbar" aria-valuenow={level} aria-valuemin={0} aria-valuemax={100} aria-label={`${name} skill level: ${level}%`}>
        <div
          ref={barRef}
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: "0%" }}
        />
      </div>
    </div>
  );
}

export function SkillsSection() {
  return (
    <section id="skills" className="py-24 relative" aria-label="Skills section">
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Heading */}
        <RevealWrapper>
          <div className="flex flex-col items-center text-center mb-16">
            <span className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">What I Know</span>
            <h2 className="text-4xl md:text-5xl font-bold">
              Technical <span className="gradient-text">Skills</span>
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-4" />
            <p className="text-muted mt-4 max-w-xl text-sm leading-relaxed">
              A curated selection of technologies I work with, ranging from frontend to backend and DevOps.
            </p>
          </div>
        </RevealWrapper>

        {/* ── 3D Tech Icon Orbit ──
            Section text (heading above) renders first as static DOM; the 3D
            orbit scene is mounted via a dynamic (ssr:false) wrapper inside a
            fixed-height relative container so text is never blocked by the 3D
            load and layout does not shift (Req 7.1, 13.1, 13.2). */}
        <RevealWrapper delay={100}>
          <div className="mb-12 glass rounded-2xl overflow-hidden border border-border">
            <p className="text-center text-xs text-muted uppercase tracking-widest pt-5 font-semibold">
              Hover an icon to reveal the skill · Tech orbit
            </p>
            <div className="relative w-full h-[480px]">
              <SkillsOrbitSceneDynamic />
            </div>
          </div>
        </RevealWrapper>

        {/* Skill progress bars */}
        <div className="grid md:grid-cols-3 gap-6">
          {SKILLS_DATA.map((cat, catIdx) => (
            <RevealWrapper key={cat.category} delay={catIdx * 100}>
              <GlassCard className="p-6 flex flex-col gap-6 h-full">
                {/* Category header */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center`} aria-hidden="true">
                    <span className="text-sm font-bold text-background">
                      {cat.category[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{cat.category}</h3>
                    <p className="text-xs text-muted">{cat.skills.length} technologies</p>
                  </div>
                </div>

                {/* Skill bars */}
                <div className="flex flex-col gap-4">
                  {cat.skills.map((skill, skillIdx) => (
                    <SkillBar
                      key={skill.name}
                      {...skill}
                      color={cat.color}
                      delay={catIdx * 100 + skillIdx * 80}
                    />
                  ))}
                </div>
              </GlassCard>
            </RevealWrapper>
          ))}
        </div>

        {/* Tech icons grid */}
        <RevealWrapper delay={400}>
          <div className="mt-12 glass rounded-2xl p-8">
            <h3 className="text-center text-sm font-semibold text-muted uppercase tracking-widest mb-8">
              Also worked with
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "MongoDB", "GraphQL", "Kubernetes", "Terraform", "Figma",
                "Stripe", "Supabase", "PlanetScale", "tRPC", "Turborepo",
                "Playwright", "Jest", "Vitest", "Storybook", "Webpack"
              ].map((tech) => (
                <span key={tech} className="tech-badge text-xs">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}
