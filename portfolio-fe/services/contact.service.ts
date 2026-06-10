import { apiClient } from '@/lib/axios';
import type { ContactInput, ContactResponse } from '@/types';

export const contactService = {
  async send(input: ContactInput): Promise<ContactResponse> {
    const { data } = await apiClient.post<ContactResponse>('/contact', input);
    return data;
  },
};
