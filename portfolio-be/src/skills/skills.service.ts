import { Injectable, NotFoundException } from '@nestjs/common';
import { Skill } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

export const createSkillSchema = z.object({
  name: z.string().trim().min(1).max(100),
  icon: z.string().optional().nullable(),
  category: z.string().trim().min(1).max(100),
  level: z.number().int().min(0).max(100),
  order: z.number().int().default(0),
});
export const updateSkillSchema = createSkillSchema.partial();
export type CreateSkillDto = z.infer<typeof createSkillSchema>;
export type UpdateSkillDto = z.infer<typeof updateSkillSchema>;

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Skill[]> {
    return this.prisma.skill.findMany({ orderBy: { order: 'asc' } });
  }

  create(dto: CreateSkillDto): Promise<Skill> {
    return this.prisma.skill.create({ data: dto });
  }

  async update(id: string, dto: UpdateSkillDto): Promise<Skill> {
    await this.findById(id);
    return this.prisma.skill.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.skill.delete({ where: { id } });
  }

  async findById(id: string): Promise<Skill> {
    const skill = await this.prisma.skill.findUnique({ where: { id } });
    if (!skill) throw new NotFoundException(`Skill "${id}" not found`);
    return skill;
  }
}
