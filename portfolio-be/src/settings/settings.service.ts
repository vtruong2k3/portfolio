import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /settings/:key (Req 21.3). */
  async findByKey(key: string) {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key },
    });
    if (!setting) throw new NotFoundException(`Setting "${key}" not found`);
    return setting;
  }

  /** GET /admin/settings/:key (Admin). */
  findByKeyAdmin(key: string) {
    return this.findByKey(key);
  }

  /** PUT /admin/settings/:key — upsert (Property 17 last-write-wins). */
  upsert(key: string, value: string) {
    return this.prisma.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
