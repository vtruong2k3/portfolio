"use client";

import { toast } from "sonner";
import { EntityTable } from "@/components/admin/EntityTable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";

type Skill = { id: string; name: string; icon: string | null; category: string; level: number; order: number };

function useAdminSkills() {
  return useQuery<Skill[]>({
    queryKey: ["admin", "skills"],
    queryFn: () => apiClient.get("/admin/skills").then((r) => r.data),
  });
}

function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/skills/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "skills"] }),
  });
}

export default function AdminSkillsPage() {
  const { data = [], isLoading } = useAdminSkills();
  const deleteMutation = useDeleteSkill();

  async function handleDelete(id: string) {
    if (!confirm("Delete this skill?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Skill deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <EntityTable
      title="Skills"
      data={data}
      columns={[
        { key: "name",     label: "Name" },
        { key: "category", label: "Category" },
        { key: "level",    label: "Level", render: (row: Skill) => `${row.level}%` },
        { key: "order",    label: "Order" },
      ]}
      isLoading={isLoading}
      onDelete={handleDelete}
      isDeleting={deleteMutation.isPending}
      createHref="/admin/skills/new"
    />
  );
}
