import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('settings')
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** GET /settings/:key — Public (Req 21.3). */
  @Get('settings/:key')
  findByKey(@Param('key') key: string) {
    return this.settingsService.findByKey(key);
  }

  /** GET /admin/settings/:key — Admin. */
  @Get('admin/settings/:key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  adminGet(@Param('key') key: string) {
    return this.settingsService.findByKeyAdmin(key);
  }

  /** PUT /admin/settings/:key — Upsert (Property 17). */
  @Put('admin/settings/:key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  adminUpsert(@Param('key') key: string, @Body() body: { value: string }) {
    return this.settingsService.upsert(key, body.value);
  }
}
