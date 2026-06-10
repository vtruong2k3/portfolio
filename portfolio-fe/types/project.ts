export interface Project {
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
  order: number;
  createdAt: string;
  updatedAt: string;
}
