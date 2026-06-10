import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../common/mailer/mailer.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  /**
   * POST /contact — Persist message first, then attempt SMTP (Req 12.6, 12.7).
   * SMTP failure is silent to the visitor (design.md SMTP resilience).
   */
  async create(dto: CreateContactDto) {
    // 1. Persist first (isRead defaults to false — Req 12.6)
    const message = await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        message: dto.message,
      },
    });

    // 2. Send email notification — fire-and-forget, never throws (Req 12.7)
    void this.mailer.sendContactNotification({
      fromName: dto.name,
      fromEmail: dto.email,
      message: dto.message,
    });

    return message;
  }

  /** GET /admin/contact — All messages, newest first (Req 16.1). */
  findAll() {
    return this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /** PATCH /admin/contact/:id/read — Idempotent read flag (Req 16.2, Property 15). */
  async markRead(id: string) {
    return this.prisma.contactMessage.update({
      where: { id },
      data: { isRead: true },
    });
  }
}
