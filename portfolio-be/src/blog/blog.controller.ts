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
  BlogService,
  createPostSchema,
  updatePostSchema,
} from './blog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('blog')
@Controller()
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // ── Public ────────────────────────────────────────────────────────────────

  @Get('posts')
  findAll() {
    return this.blogService.findAllPublished();
  }

  @Get('posts/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  // ── Admin (Req 20.5, 20.6) ────────────────────────────────────────────────

  @Get('admin/posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  adminFindAll() {
    return this.blogService.findAllAdmin();
  }

  @Post('admin/posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  adminCreate(@Body() body: unknown) {
    return this.blogService.create(createPostSchema.parse(body));
  }

  @Patch('admin/posts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  adminUpdate(@Param('id') id: string, @Body() body: unknown) {
    return this.blogService.update(id, updatePostSchema.parse(body));
  }

  @Delete('admin/posts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  adminRemove(@Param('id') id: string) {
    return this.blogService.remove(id);
  }
}
