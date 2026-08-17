import { notFound } from "next/navigation";
import { ModulePage } from "@/components/module-pages";
import type { WorkspaceRole } from "@/lib/permissions";

const roles = new Set(["front-desk", "housekeeping", "maintenance", "manager"]);
export default async function Page({ params }: { params: Promise<{ workspace: string; module: string }> }) {
  const { workspace, module } = await params;
  if (!roles.has(workspace)) notFound();
  return <ModulePage role={workspace as WorkspaceRole} module={module}/>;
}
