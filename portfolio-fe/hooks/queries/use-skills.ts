'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { skillService } from '@/services/skill.service';
import { queryKeys } from '@/lib/query-keys';
import type { Skill } from '@/types';

export function useSkills(): UseQueryResult<Skill[], Error> {
  return useQuery({
    queryKey: queryKeys.skills.all,
    queryFn: skillService.getAll,
  });
}
