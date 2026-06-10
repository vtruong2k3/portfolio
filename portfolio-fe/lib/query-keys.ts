// Centralized React Query keys for cache consistency.
export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    featured: ['projects', 'featured'] as const,
    detail: (slug: string) => ['projects', 'detail', slug] as const,
  },
  skills: {
    all: ['skills'] as const,
  },
  experiences: {
    all: ['experiences'] as const,
  },
} as const;
