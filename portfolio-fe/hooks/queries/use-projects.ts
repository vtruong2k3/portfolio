'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { projectService } from '@/services/project.service';
import { queryKeys } from '@/lib/query-keys';
import type { Project } from '@/types';

export function useProjects(): UseQueryResult<Project[], Error> {
  return useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: projectService.getAll,
  });
}

export function useFeaturedProjects(): UseQueryResult<Project[], Error> {
  return useQuery({
    queryKey: queryKeys.projects.featured,
    queryFn: projectService.getFeatured,
  });
}

export function useProject(slug: string): UseQueryResult<Project, Error> {
  return useQuery({
    queryKey: queryKeys.projects.detail(slug),
    queryFn: () => projectService.getBySlug(slug),
    enabled: slug.length > 0,
  });
}
