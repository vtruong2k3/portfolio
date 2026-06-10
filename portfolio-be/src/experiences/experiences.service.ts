import { Injectable, NotFoundException } from '@nestjs/common';
import { Experience } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

export const createExperienceSchema = z.object({
  company: z.string().trim().min(1).max(200),
  position: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  order: z.number().int().default(0),
});
export const updateExperienceSchema = createExperienceSchema.partial();
export type CreateExperienceDto = z.infer<typeof createExperienceSchema>;
export type UpdateExperienceDto = z.infer<typeof updateExperienceSchema>;

@Injectable()
export class ExperiencesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Experience[]> {
    return this.prisma.experience.findMany({ orderBy: { order: 'asc' } });
  }

  create(dto: CreateExperienceDto): Promise<Experience> {
    return this.prisma.experience.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async update(id: string, dto: UpdateExperienceDto): Promise<Experience> {
    await this.findById(id);
    return this.prisma.experience.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.experience.delete({ where: { id } });
  }

  async findById(id: string): Promise<Experience> {
    const exp = await this.prisma.experience.findUnique({ where: { id } });
    if (!exp) throw new NotFoundException(`Experience "${id}" not found`);
    return exp;
  }
}
