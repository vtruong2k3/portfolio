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
  SkillsService,
  createSkillSchema,
  updateSkillSchema,
} from './skills.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('skills')
@Controller()
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get('skills')
  findAll() {
    return this.skillsService.findAll();
  }

  @Get('admin/skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  adminFindAll() {
    return this.skillsService.findAll();
  }

  @Post('admin/skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(createSkillSchema))
  @HttpCode(HttpStatus.CREATED)
  adminCreate(@Body() body: unknown) {
    return this.skillsService.create(createSkillSchema.parse(body));
  }

  @Patch('admin/skills/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  adminUpdate(@Param('id') id: string, @Body() body: unknown) {
    return this.skillsService.update(id, updateSkillSchema.parse(body));
  }

  @Delete('admin/skills/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  adminRemove(@Param('id') id: string) {
    return this.skillsService.remove(id);
  }
}
