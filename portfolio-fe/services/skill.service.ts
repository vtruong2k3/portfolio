import { apiClient } from '@/lib/axios';
import type { Skill } from '@/types';

export const skillService = {
  async getAll(): Promise<Skill[]> {
    const { data } = await apiClient.get<Skill[]>('/skills');
    return data;
  },
};
