"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminProjectService } from "@/services/admin/admin-project.service";
import { queryKeys } from "@/lib/query-keys";
import type { Project } from "@/types";

export function useAdminProjects() {
  return useQuery({
    queryKey: ["admin", "projects"],
    queryFn: adminProjectService.getAll,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project>) => adminProjectService.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      void qc.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      adminProjectService.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      void qc.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminProjectService.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      void qc.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}
