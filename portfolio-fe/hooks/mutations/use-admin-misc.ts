"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";

// ── Contact messages ──────────────────────────────────────────────────────────

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const contactAdminService = {
  getAll: (): Promise<ContactMessage[]> =>
    apiClient.get("/admin/contact").then((r) => r.data),
  markRead: (id: string): Promise<ContactMessage> =>
    apiClient.patch(`/admin/contact/${id}/read`).then((r) => r.data),
};

export function useAdminContact() {
  return useQuery({
    queryKey: ["admin", "contact"],
    queryFn: contactAdminService.getAll,
  });
}

export function useMarkContactRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactAdminService.markRead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "contact"] }),
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export type AnalyticsStats = {
  total: number;
  byPath: { path: string; count: number }[];
};

export function useAdminAnalytics() {
  return useQuery<AnalyticsStats>({
    queryKey: ["admin", "analytics"],
    queryFn: () => apiClient.get("/admin/analytics").then((r) => r.data),
    refetchInterval: 30_000,
  });
}

// ── Upload ─────────────────────────────────────────────────────────────────────

export function useUploadFile() {
  return useMutation({
    mutationFn: async (file: File): Promise<{ url: string }> => {
      const form = new FormData();
      form.append("file", file);
      return apiClient
        .post("/admin/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
  });
}
