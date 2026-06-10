import { apiClient } from '@/lib/axios';
import type { Project } from '@/types';

export const projectService = {
  async getAll(): Promise<Project[]> {
    const { data } = await apiClient.get<Project[]>('/projects');
    return data;
  },

  async getFeatured(): Promise<Project[]> {
    const { data } = await apiClient.get<Project[]>('/projects/featured');
    return data;
  },

  async getBySlug(slug: string): Promise<Project> {
    const { data } = await apiClient.get<Project>(`/projects/${slug}`);
    return data;
  },
};
