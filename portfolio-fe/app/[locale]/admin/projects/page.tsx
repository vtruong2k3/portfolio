"use client";

import { toast } from "sonner";
import { EntityTable } from "@/components/admin/EntityTable";
import { useAdminProjects, useDeleteProject } from "@/hooks/mutations/use-admin-projects";
import type { Project } from "@/types";

export default function AdminProjectsPage() {
  const { data = [], isLoading } = useAdminProjects();
  const deleteMutation = useDeleteProject();

  async function handleDelete(id: string) {
    if (!confirm("Delete this project?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Project deleted");
    } catch {
      toast.error("Failed to delete project");
    }
  }

  const columns = [
    { key: "title",    label: "Title" },
    {
      key: "techStack",
      label: "Tech Stack",
      render: (row: Project) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {row.techStack.slice(0, 4).map((t) => (
            <span key={t} className="tech-badge">{t}</span>
          ))}
          {row.techStack.length > 4 && (
            <span className="text-xs text-muted">+{row.techStack.length - 4}</span>
          )}
        </div>
      ),
    },
    {
      key: "featured",
      label: "Featured",
      render: (row: Project) => (
        <span className={`text-xs font-semibold ${row.featured ? "text-primary" : "text-muted"}`}>
          {row.featured ? "Yes" : "No"}
        </span>
      ),
    },
    { key: "order", label: "Order" },
  ];

  return (
    <EntityTable
      title="Projects"
      data={data}
      columns={columns}
      isLoading={isLoading}
      editHref={(row) => `/admin/projects/${row.id}/edit`}
      onDelete={handleDelete}
      isDeleting={deleteMutation.isPending}
      createHref="/admin/projects/new"
    />
  );
}
