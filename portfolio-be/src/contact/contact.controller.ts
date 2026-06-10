import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiTags('contact')
@Controller()
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * POST /contact — Public, throttled (Req 12.3, 13.1, 13.2).
   * Returns 201 on success, 400 for invalid payload (nestjs-zod), 429 for rate-limit.
   */
  @Post('contact')
  @Throttle({
    default: {
      ttl: Number(process.env.CONTACT_RATE_TTL ?? 60_000),
      limit: Number(process.env.CONTACT_RATE_LIMIT ?? 5),
    },
  })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }

  /**
   * GET /admin/contact — List all messages (Req 16.1).
   */
  @Get('admin/contact')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findAll() {
    return this.contactService.findAll();
  }

  /**
   * PATCH /admin/contact/:id/read — Mark as read (Req 16.2, Property 15).
   */
  @Patch('admin/contact/:id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  markRead(@Param('id') id: string) {
    return this.contactService.markRead(id);
  }
}
