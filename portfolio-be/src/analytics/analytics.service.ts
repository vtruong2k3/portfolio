import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /analytics/view — Record a page view without PII (Req 22.2, 22.3, Property 25).
   * No IP address, no cookies, no user identifier stored.
   */
  async recordView(data: {
    path: string;
    referrer?: string;
    userAgent?: string;
  }) {
    return this.prisma.pageView.create({
      data: {
        path: data.path,
        referrer: data.referrer ?? null,
        userAgent: data.userAgent ?? null, // coarse UA only, no PII
      },
    });
  }

  /**
   * GET /admin/analytics — Aggregated stats (Req 22.4, Property 25).
   */
  async getStats() {
    const [total, byPath] = await Promise.all([
      this.prisma.pageView.count(),
      this.prisma.pageView.groupBy({
        by: ['path'],
        _count: { path: true },
        orderBy: { _count: { path: 'desc' } },
      }),
    ]);

    return {
      total,
      byPath: byPath.map((row) => ({ path: row.path, count: row._count.path })),
    };
  }
}
