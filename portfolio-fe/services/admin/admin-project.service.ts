import apiClient from "@/lib/axios";
import type { Project } from "@/types";

// Admin project service — all requests carry Bearer token automatically
// (interceptor added in lib/axios.ts)

export const adminProjectService = {
  getAll: (): Promise<Project[]> =>
    apiClient.get("/admin/projects").then((r) => r.data),

  create: (data: Partial<Project>): Promise<Project> =>
    apiClient.post("/admin/projects", data).then((r) => r.data),

  update: (id: string, data: Partial<Project>): Promise<Project> =>
    apiClient.patch(`/admin/projects/${id}`, data).then((r) => r.data),

  remove: (id: string): Promise<void> =>
    apiClient.delete(`/admin/projects/${id}`).then((r) => r.data),
};
