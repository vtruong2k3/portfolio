"use client";

import { toast } from "sonner";
import { EntityTable } from "@/components/admin/EntityTable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";

type BlogPost = { id: string; title: string; slug: string; published: boolean; publishedAt: string | null; tags: string[] };

function useAdminPosts() {
  return useQuery<BlogPost[]>({
    queryKey: ["admin", "posts"],
    queryFn: () => apiClient.get("/admin/posts").then((r) => r.data),
  });
}

function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/posts/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "posts"] }),
  });
}

export default function AdminPostsPage() {
  const { data = [], isLoading } = useAdminPosts();
  const deleteMutation = useDeletePost();

  async function handleDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <EntityTable
      title="Blog Posts"
      data={data}
      columns={[
        { key: "title",     label: "Title" },
        { key: "slug",      label: "Slug" },
        {
          key: "published",
          label: "Status",
          render: (row: BlogPost) => (
            <span className={`text-xs font-semibold ${row.published ? "text-primary" : "text-muted"}`}>
              {row.published ? "Published" : "Draft"}
            </span>
          ),
        },
        {
          key: "publishedAt",
          label: "Published At",
          render: (row: BlogPost) => row.publishedAt
            ? new Date(row.publishedAt).toLocaleDateString()
            : "—",
        },
      ]}
      isLoading={isLoading}
      editHref={(row) => `/admin/posts/${row.id}/edit`}
      onDelete={handleDelete}
      isDeleting={deleteMutation.isPending}
      createHref="/admin/posts/new"
    />
  );
}
