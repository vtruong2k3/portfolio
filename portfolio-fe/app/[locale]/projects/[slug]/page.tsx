import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type Project = {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  images: string[];
  techStack: string[];
  githubUrl: string | null;
  demoUrl: string | null;
  featured: boolean;
};

async function fetchProject(slug: string): Promise<Project | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${apiUrl}/projects/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Dynamic metadata reflecting each project (Req 24.5, Property 22)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchProject(slug);
  if (!project) return { title: "Project not found" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portfolio.dev";

  return {
    title: project.title,
    description: project.description,
    openGraph: {
      title: project.title,
      description: project.description,
      type: "website",
      url: `${siteUrl}/projects/${slug}`,
      images: project.thumbnail ? [{ url: project.thumbnail }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description: project.description,
      images: project.thumbnail ? [project.thumbnail] : [],
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await fetchProject(slug);
  if (!project) notFound();

  return (
    <article className="min-h-screen py-24 px-6" aria-label={`Project: ${project.title}`}>
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="../"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors duration-200 mb-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Portfolio
        </Link>

        {/* Hero image */}
        {project.thumbnail && (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-10 border border-border">
            <Image
              src={project.thumbnail}
              alt={`${project.title} thumbnail`}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {project.techStack.map((tech) => (
              <span key={tech} className="tech-badge">{tech}</span>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
            {project.title}
          </h1>
          <p className="text-muted leading-relaxed">{project.description}</p>
        </header>

        {/* Links */}
        <div className="flex gap-4 mb-12">
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="glass px-5 py-2.5 rounded-xl text-sm font-medium text-foreground hover:text-primary border border-border hover:border-primary/30 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
              </svg>
              GitHub
            </a>
          )}
          {project.demoUrl && (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-primary to-accent text-background hover:opacity-90 transition-opacity duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Live Demo
            </a>
          )}
        </div>

        {/* Additional images */}
        {project.images.length > 0 && (
          <section aria-label="Project screenshots">
            <h2 className="text-lg font-semibold text-foreground mb-4">Screenshots</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.images.map((img, i) => (
                <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-border">
                  <Image
                    src={img}
                    alt={`${project.title} screenshot ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
