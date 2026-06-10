import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description: "Thoughts on web development, 3D graphics, TypeScript, and software engineering.",
};

// Server Component — fetches blog posts at render time (Req 20.1)
async function fetchPosts() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${apiUrl}/posts`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json() as Promise<{
      id: string;
      title: string;
      slug: string;
      excerpt: string;
      tags: string[];
      publishedAt: string | null;
      coverImage: string | null;
    }[]>;
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const posts = await fetchPosts();

  return (
    <div className="min-h-screen py-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-14 text-center">
          <span className="text-primary text-sm font-semibold uppercase tracking-widest">Writing</span>
          <h1 className="text-4xl md:text-5xl font-bold mt-3">
            The <span className="gradient-text">Blog</span>
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-4 mx-auto" />
          <p className="text-muted mt-4 text-sm leading-relaxed max-w-xl mx-auto">
            Thoughts on web development, 3D graphics, TypeScript, and software engineering.
          </p>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center border border-border">
            <p className="text-4xl mb-4" aria-hidden="true">✍️</p>
            <p className="text-muted text-sm">No posts published yet. Check back soon!</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-6" role="list">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`./blog/${post.slug}`}
                  className="group block glass rounded-2xl p-6 border border-border hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-200 mb-2">
                        {post.title}
                      </h2>
                      <p className="text-muted text-sm leading-relaxed line-clamp-2 mb-3">
                        {post.excerpt}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {post.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="tech-badge">{tag}</span>
                        ))}
                      </div>
                    </div>
                    {post.publishedAt && (
                      <time
                        dateTime={post.publishedAt}
                        className="shrink-0 text-xs text-muted bg-surface-2 px-2 py-1 rounded-full whitespace-nowrap"
                      >
                        {new Date(post.publishedAt).toLocaleDateString("en-US", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </time>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
