'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { experienceService } from '@/services/experience.service';
import { queryKeys } from '@/lib/query-keys';
import type { Experience } from '@/types';

export function useExperiences(): UseQueryResult<Experience[], Error> {
  return useQuery({
    queryKey: queryKeys.experiences.all,
    queryFn: experienceService.getAll,
  });
}
