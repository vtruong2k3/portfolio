import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('analytics')
@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * POST /analytics/view — Public beacon, returns 202 (Req 22.1, 22.2).
   */
  @Post('analytics/view')
  @HttpCode(HttpStatus.ACCEPTED)
  recordView(
    @Body() body: { path: string; referrer?: string; userAgent?: string },
  ) {
    return this.analyticsService.recordView(body);
  }

  /**
   * GET /admin/analytics — Admin aggregated stats (Req 22.4).
   */
  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getStats() {
    return this.analyticsService.getStats();
  }
}
