import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT') ?? 587,
      secure: false,
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
  }

  /**
   * Send contact notification email (Req 12.7).
   * SMTP failure is logged but does NOT fail the request — message is already persisted.
   */
  async sendContactNotification(opts: {
    fromName: string;
    fromEmail: string;
    message: string;
  }): Promise<void> {
    const to = this.config.get<string>('CONTACT_NOTIFY_EMAIL');
    if (!to) {
      this.logger.warn('CONTACT_NOTIFY_EMAIL not set — skipping SMTP send');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"Portfolio Contact" <${this.config.get('SMTP_USER')}>`,
        to,
        replyTo: opts.fromEmail,
        subject: `New contact from ${opts.fromName}`,
        text: `From: ${opts.fromName} <${opts.fromEmail}>\n\n${opts.message}`,
        html: `<p><strong>From:</strong> ${opts.fromName} &lt;${opts.fromEmail}&gt;</p>
               <hr/>
               <p>${opts.message.replace(/\n/g, '<br/>')}</p>`,
      });
      this.logger.log(`Contact notification sent to ${to}`);
    } catch (err) {
      // SMTP resilience (design.md §Error Handling): persist first, log and continue
      this.logger.error('SMTP send failed — message still saved', err);
    }
  }
}
