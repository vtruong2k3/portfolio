import { Injectable, NotFoundException } from '@nestjs/common';
import { Project } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(1),
  thumbnail: z.string().url().optional().nullable(),
  images: z.array(z.string()).default([]),
  techStack: z.array(z.string()).default([]),
  githubUrl: z.string().url().optional().nullable(),
  demoUrl: z.string().url().optional().nullable(),
  featured: z.boolean().default(false),
  order: z.number().int().default(0),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Public (Req 3.1–3.4) ─────────────────────────────────────────────────

  findAll(): Promise<Project[]> {
    return this.prisma.project.findMany({ orderBy: { order: 'asc' } });
  }

  findFeatured(): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { featured: true },
      orderBy: { order: 'asc' },
    });
  }

  async findBySlug(slug: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { slug } });
    if (!project) throw new NotFoundException(`Project "${slug}" not found`);
    return project;
  }

  // ── Admin CRUD (Req 15.1–15.6) ────────────────────────────────────────────

  async create(dto: CreateProjectDto): Promise<Project> {
    return this.prisma.project.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    await this.findById(id);
    return this.prisma.project.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.project.delete({ where: { id } });
  }

  async findById(id: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException(`Project "${id}" not found`);
    return project;
  }
}
