import { z } from 'zod';

// Contact form validation (Req 12.4, 12.5). Mirrors the API DTO.
export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  message: z.string().trim().min(1).max(5000),
});

export type ContactSchema = z.infer<typeof contactSchema>;
