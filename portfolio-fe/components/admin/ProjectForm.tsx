"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useCreateProject, useUpdateProject } from "@/hooks/mutations/use-admin-projects";
import type { Project } from "@/types";

const schema = z.object({
  title:       z.string().min(1, "Required"),
  slug:        z.string().min(1, "Required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  description: z.string().min(1, "Required"),
  thumbnail:   z.string().optional().default(""),
  techStack:   z.string().default(""),
  githubUrl:   z.string().optional().default(""),
  demoUrl:     z.string().optional().default(""),
  featured:    z.boolean().default(false),
  order:       z.coerce.number().int().default(0),
});
type FormValues = z.infer<typeof schema>;

interface ProjectFormProps {
  project?: Project;
}

export function ProjectForm({ project }: ProjectFormProps) {
  const router = useRouter();
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const isEdit = Boolean(project);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: project ? {
      title:       project.title,
      slug:        project.slug,
      description: project.description,
      thumbnail:   project.thumbnail ?? "",
      techStack:   project.techStack.join(", "),
      githubUrl:   project.githubUrl ?? "",
      demoUrl:     project.demoUrl ?? "",
      featured:    project.featured,
      order:       project.order,
    } : {
      featured: false, order: 0, techStack: "",
    },
  });

  async function onSubmit(values: FormValues) {
    const data = {
      ...values,
      thumbnail:  values.thumbnail || null,
      githubUrl:  values.githubUrl  || null,
      demoUrl:    values.demoUrl    || null,
      techStack:  values.techStack.split(",").map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (isEdit && project) {
        await updateMutation.mutateAsync({ id: project.id, data });
        toast.success("Project updated");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Project created");
      }
      router.replace("/admin/projects");
    } catch {
      toast.error("Save failed");
    }
  }

  const fields: { name: keyof FormValues; label: string; type?: string; placeholder?: string; required?: boolean }[] = [
    { name: "title",       label: "Title",       placeholder: "My Awesome Project", required: true },
    { name: "slug",        label: "Slug",        placeholder: "my-awesome-project",  required: true },
    { name: "description", label: "Description", placeholder: "Project description...", required: true },
    { name: "thumbnail",   label: "Thumbnail URL", placeholder: "https://..." },
    { name: "techStack",   label: "Tech Stack (comma-separated)", placeholder: "React, TypeScript, NestJS" },
    { name: "githubUrl",   label: "GitHub URL",  placeholder: "https://github.com/..." },
    { name: "demoUrl",     label: "Demo URL",    placeholder: "https://..." },
    { name: "order",       label: "Order",       type: "number" },
  ];

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-foreground mb-6">{isEdit ? "Edit Project" : "New Project"}</h1>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="glass rounded-2xl border border-border p-6 flex flex-col gap-5"
        aria-label={isEdit ? "Edit project form" : "New project form"}
        noValidate
      >
        {fields.map(({ name, label, type = "text", placeholder }) => (
          <div key={name} className="flex flex-col gap-1.5">
            <label htmlFor={`project-${name}`} className="text-sm font-medium text-foreground">
              {label}
            </label>
            <input
              id={`project-${name}`}
              type={type}
              className="input-base"
              placeholder={placeholder}
              {...register(name)}
              aria-describedby={errors[name] ? `${name}-error` : undefined}
            />
            {errors[name] && (
              <p id={`${name}-error`} className="text-xs text-red-400" role="alert">
                {errors[name]?.message as string}
              </p>
            )}
          </div>
        ))}

        {/* Featured toggle */}
        <div className="flex items-center gap-3">
          <input
            id="project-featured"
            type="checkbox"
            className="w-4 h-4 accent-primary"
            {...register("featured")}
          />
          <label htmlFor="project-featured" className="text-sm font-medium text-foreground">
            Featured project
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-background font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity duration-200"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Project"}
          </button>
          <button
            type="button"
            onClick={() => router.replace("/admin/projects")}
            className="px-5 py-3 rounded-xl border border-border text-muted hover:text-foreground hover:border-border-strong transition-colors duration-200 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
