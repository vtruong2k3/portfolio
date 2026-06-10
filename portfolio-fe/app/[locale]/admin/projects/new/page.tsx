import { ProjectForm } from "@/components/admin/ProjectForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New Project" };

export default function AdminNewProjectPage() {
  return <ProjectForm />;
}
