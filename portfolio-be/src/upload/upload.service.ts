import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

@Injectable()
export class UploadService {
  private readonly uploadDir: string;
  private readonly publicBase: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir =
      config.get<string>('UPLOAD_DIR') ?? path.join(process.cwd(), 'uploads');
    this.publicBase =
      config.get<string>('PUBLIC_BASE_URL') ?? 'http://localhost:3001';
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  /**
   * Store file locally and return its public URL (Req 16.3).
   * Throws 400 for unsupported MIME types (Req 16.4, Property 16).
   */
  async saveFile(file: Express.Multer.File): Promise<{ url: string }> {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed. Accepted: ${[...ALLOWED_MIME].join(', ')}`,
      );
    }

    const ext =
      path.extname(file.originalname) || `.${file.mimetype.split('/')[1]}`;
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const dest = path.join(this.uploadDir, filename);

    fs.writeFileSync(dest, file.buffer);

    return { url: `${this.publicBase}/uploads/${filename}` };
  }
}
