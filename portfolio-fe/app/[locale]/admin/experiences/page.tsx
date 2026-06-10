"use client";

import { toast } from "sonner";
import { EntityTable } from "@/components/admin/EntityTable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";

type Experience = { id: string; company: string; position: string; startDate: string; endDate: string | null; order: number };

function useAdminExperiences() {
  return useQuery<Experience[]>({
    queryKey: ["admin", "experiences"],
    queryFn: () => apiClient.get("/admin/experiences").then((r) => r.data),
  });
}

function useDeleteExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/experiences/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "experiences"] }),
  });
}

export default function AdminExperiencesPage() {
  const { data = [], isLoading } = useAdminExperiences();
  const deleteMutation = useDeleteExperience();

  async function handleDelete(id: string) {
    if (!confirm("Delete this experience?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Experience deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <EntityTable
      title="Experience"
      data={data}
      columns={[
        { key: "company",  label: "Company" },
        { key: "position", label: "Position" },
        {
          key: "startDate",
          label: "Period",
          render: (row: Experience) =>
            `${new Date(row.startDate).getFullYear()} – ${row.endDate ? new Date(row.endDate).getFullYear() : "Present"}`,
        },
        { key: "order", label: "Order" },
      ]}
      isLoading={isLoading}
      editHref={(row) => `/admin/experiences/${row.id}/edit`}
      onDelete={handleDelete}
      isDeleting={deleteMutation.isPending}
      createHref="/admin/experiences/new"
    />
  );
}
