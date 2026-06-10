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
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  ProjectsService,
  createProjectSchema,
  updateProjectSchema,
} from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('projects')
@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ── Public (Req 3.1–3.4) ─────────────────────────────────────────────────

  @Get('projects')
  findAll() {
    return this.projectsService.findAll();
  }

  @Get('projects/featured')
  findFeatured() {
    return this.projectsService.findFeatured();
  }

  @Get('projects/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.projectsService.findBySlug(slug);
  }

  // ── Admin CRUD (Req 15.1–15.6) ────────────────────────────────────────────

  @Get('admin/projects')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  adminFindAll() {
    return this.projectsService.findAll();
  }

  @Post('admin/projects')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(createProjectSchema))
  @HttpCode(HttpStatus.CREATED)
  adminCreate(@Body() body: unknown) {
    return this.projectsService.create(createProjectSchema.parse(body));
  }

  @Patch('admin/projects/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(updateProjectSchema))
  adminUpdate(@Param('id') id: string, @Body() body: unknown) {
    return this.projectsService.update(id, updateProjectSchema.parse(body));
  }

  @Delete('admin/projects/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  adminRemove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
