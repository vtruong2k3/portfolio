import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  publishedAt: string | null;
  coverImage: string | null;
};

async function fetchPost(slug: string): Promise<Post | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${apiUrl}/posts/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: "article" },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();

  return (
    <article className="min-h-screen py-24 px-6" aria-label={`Blog post: ${post.title}`}>
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href="../blog"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors duration-200 mb-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Blog
        </Link>

        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span key={tag} className="tech-badge">{tag}</span>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
            {post.title}
          </h1>
          {post.publishedAt && (
            <time
              dateTime={post.publishedAt}
              className="text-sm text-muted"
            >
              Published {new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </time>
          )}
        </header>

        {/* Content (Req 20.4 — rendered content) */}
        <div
          className="prose prose-invert prose-sm max-w-none text-muted leading-relaxed
            prose-headings:text-foreground prose-headings:font-bold
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-code:text-primary prose-code:bg-surface-2 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-surface-2 prose-pre:border prose-pre:border-border
            prose-blockquote:border-l-primary prose-blockquote:text-muted"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </article>
  );
}
