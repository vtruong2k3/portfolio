import { apiClient } from '@/lib/axios';
import type { Experience } from '@/types';

export const experienceService = {
  async getAll(): Promise<Experience[]> {
    const { data } = await apiClient.get<Experience[]>('/experiences');
    return data;
  },
};
