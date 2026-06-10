import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().trim().min(1).max(300),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .regex(/^[a-z0-9-]+$/),
  excerpt: z.string().trim().min(1).max(500),
  content: z.string().trim().min(1),
  coverImage: z.string().url().optional().nullable(),
  tags: z.array(z.string()).default([]),
  published: z.boolean().default(false),
  publishedAt: z.string().datetime().optional().nullable(),
});
export const updatePostSchema = createPostSchema.partial();
export type CreatePostDto = z.infer<typeof createPostSchema>;
export type UpdatePostDto = z.infer<typeof updatePostSchema>;

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /posts — published only, newest first (Req 20.1, Property 7). */
  findAllPublished() {
    return this.prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
    });
  }

  /** GET /posts/:slug — published only (Req 20.2, 20.3). */
  async findBySlug(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, published: true },
    });
    if (!post) throw new NotFoundException(`Post "${slug}" not found`);
    return post;
  }

  // ── Admin CRUD (Req 20.5, 20.6) ───────────────────────────────────────────

  findAllAdmin() {
    return this.prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreatePostDto) {
    return this.prisma.blogPost.create({
      data: {
        ...dto,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
      },
    });
  }

  async update(id: string, dto: UpdatePostDto) {
    await this.findById(id);
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        ...dto,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.blogPost.delete({ where: { id } });
  }

  async findById(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException(`Post "${id}" not found`);
    return post;
  }
}
