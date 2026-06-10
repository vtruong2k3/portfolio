import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Mirror of portfolio-fe/lib/schemas/contact.schema.ts (Req 12.4, 12.5, 12.8)
export const createContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  message: z.string().trim().min(1).max(5000),
});

export class CreateContactDto extends createZodDto(createContactSchema) {}
