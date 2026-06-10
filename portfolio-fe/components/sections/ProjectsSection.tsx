"use client";

import React, { useRef, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

// Mock data — Req 5.6: use mock data during P2
const MOCK_PROJECTS = [
  {
    id: "1",
    title: "E-Commerce Platform",
    slug: "ecommerce-platform",
    description: "A full-featured e-commerce platform with real-time inventory, payment processing, and admin dashboard. Built with Next.js, NestJS, PostgreSQL, and Stripe.",
    thumbnail: null,
    techStack: ["Next.js", "NestJS", "PostgreSQL", "Stripe", "Redis", "Docker"],
    githubUrl: "https://github.com",
    demoUrl: "https://example.com",
    featured: true,
  },
  {
    id: "2",
    title: "AI Content Studio",
    slug: "ai-content-studio",
    description: "An AI-powered content generation tool with multi-model support, team collaboration, and analytics. Integrates OpenAI GPT-4 and Anthropic Claude.",
    thumbnail: null,
    techStack: ["React", "FastAPI", "OpenAI", "Anthropic", "MongoDB", "Tailwind"],
    githubUrl: "https://github.com",
    demoUrl: "https://example.com",
    featured: true,
  },
  {
    id: "3",
    title: "DevOps Dashboard",
    slug: "devops-dashboard",
    description: "Real-time infrastructure monitoring dashboard with alerts, metrics visualization, and CI/CD pipeline management for cloud environments.",
    thumbnail: null,
    techStack: ["Vue.js", "Go", "InfluxDB", "Grafana", "Kubernetes", "Prometheus"],
    githubUrl: "https://github.com",
    demoUrl: null,
    featured: false,
  },
  {
    id: "4",
    title: "3D Portfolio Builder",
    slug: "3d-portfolio-builder",
    description: "Drag-and-drop portfolio builder with 3D elements, custom themes, and one-click deployment. Used by 500+ developers worldwide.",
    thumbnail: null,
    techStack: ["React", "Three.js", "Supabase", "Framer Motion", "Vercel"],
    githubUrl: "https://github.com",
    demoUrl: "https://example.com",
    featured: true,
  },
];

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

function ProjectCard({ project, index }: { project: typeof MOCK_PROJECTS[0]; index: number }) {
  const isLarge = index === 0;
  const colors = [
    "from-primary/20 to-primary-strong/20",
    "from-accent/20 to-accent-strong/20",
    "from-primary-strong/20 to-accent/20",
    "from-accent-strong/20 to-primary/20",
  ];
  const gradients = [
    "from-primary/40 to-primary-strong/40",
    "from-accent/40 to-accent-strong/40",
    "from-primary-strong/40 to-accent/40",
    "from-accent-strong/40 to-primary/40",
  ];

  return (
    <RevealWrapper delay={index * 100} className={isLarge ? "md:col-span-3 lg:col-span-3" : "md:col-span-1"}>
      <GlassCard className={`group flex flex-col ${isLarge ? 'md:flex-row' : ''} h-full overflow-hidden hover:border-primary/40 transition-colors duration-500`}>
        {/* Thumbnail */}
        <div className={`relative ${isLarge ? 'md:w-[50%] md:shrink-0 md:min-h-[26rem]' : 'h-56'} bg-gradient-to-br ${colors[index % colors.length]} flex items-center justify-center overflow-hidden`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${gradients[index % gradients.length]} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} aria-hidden="true" />
          
          {/* Subtle glow behind icon */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-background/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          
          <div className="relative z-10 flex flex-col items-center justify-center p-6 glass rounded-3xl border border-white/10 shadow-2xl group-hover:-translate-y-2 transition-transform duration-500">
            <div className="text-5xl mb-3 drop-shadow-xl" aria-hidden="true">
              {["🛒", "🤖", "📊", "🎨"][index % 4]}
            </div>
            <span className="text-xs font-mono text-foreground/80 uppercase tracking-widest font-bold">Project {String(index + 1).padStart(2, "0")}</span>
          </div>

          {project.featured && (
            <span className="absolute top-4 right-4 text-xs font-bold px-3 py-1.5 rounded-full bg-background/40 backdrop-blur-md border border-white/20 text-foreground shadow-lg z-20">
              ★ Featured
            </span>
          )}
        </div>

        {/* Content */}
        <div className={`flex flex-col flex-1 p-8 gap-5 ${isLarge ? 'justify-center' : ''}`}>
          <div>
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-200">
              {project.title}
            </h3>
            <p className="text-muted text-sm leading-relaxed mt-2 line-clamp-3">
              {project.description}
            </p>
          </div>

          {/* Tech stack */}
          <div className="flex flex-wrap gap-1.5" aria-label="Technologies used">
            {project.techStack.slice(0, 4).map((tech) => (
              <span key={tech} className="tech-badge">{tech}</span>
            ))}
            {project.techStack.length > 4 && (
              <span className="tech-badge text-muted">+{project.techStack.length - 4}</span>
            )}
          </div>

          {/* Links */}
          <div className="flex gap-3 mt-auto pt-4 border-t border-border">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${project.title} source on GitHub`}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub
              </a>
            )}
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View live demo of ${project.title}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors duration-200 ml-auto"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Live Demo
              </a>
            )}
          </div>
        </div>
      </GlassCard>
    </RevealWrapper>
  );
}

export function ProjectsSection() {
  return (
    <section id="projects" className="py-24 relative" aria-label="Projects section">
      <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="w-[70%] mx-auto">
        {/* Heading */}
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

        {/* Projects grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {MOCK_PROJECTS.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>

        {/* View all CTA */}
        <RevealWrapper delay={400}>
          <div className="flex justify-center mt-10">
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 glass rounded-full border border-border-strong text-sm font-semibold text-muted hover:text-foreground hover:border-primary/30 transition-all duration-300"
            >
              View all projects
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}
