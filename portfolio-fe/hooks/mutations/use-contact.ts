'use client';

import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { contactService } from '@/services/contact.service';
import type { ContactInput, ContactResponse } from '@/types';

export function useSendContact(): UseMutationResult<
  ContactResponse,
  Error,
  ContactInput
> {
  return useMutation({
    mutationFn: contactService.send,
  });
}
