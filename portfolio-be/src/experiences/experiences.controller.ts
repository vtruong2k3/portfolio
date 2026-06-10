import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ExperiencesService,
  createExperienceSchema,
  updateExperienceSchema,
} from './experiences.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('experiences')
@Controller()
export class ExperiencesController {
  constructor(private readonly experiencesService: ExperiencesService) {}

  @Get('experiences')
  findAll() {
    return this.experiencesService.findAll();
  }

  @Get('admin/experiences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  adminFindAll() {
    return this.experiencesService.findAll();
  }

  @Post('admin/experiences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  adminCreate(@Body() body: unknown) {
    return this.experiencesService.create(createExperienceSchema.parse(body));
  }

  @Patch('admin/experiences/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  adminUpdate(@Param('id') id: string, @Body() body: unknown) {
    return this.experiencesService.update(
      id,
      updateExperienceSchema.parse(body),
    );
  }

  @Delete('admin/experiences/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  adminRemove(@Param('id') id: string) {
    return this.experiencesService.remove(id);
  }
}
