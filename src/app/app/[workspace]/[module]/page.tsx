import { notFound } from "next/navigation";
import { ModulePage } from "@/components/module-pages";
import type { WorkspaceRole } from "@/lib/permissions";

const roles = new Set(["front-desk", "housekeeping", "maintenance", "manager"]);
export default async function Page({ params, searchParams }: { params: Promise<{ workspace: string; module: string }>; searchParams: Promise<{ create?: string; request?: string }> }) {
  const { workspace, module } = await params;
  const query = await searchParams;
  if (!roles.has(workspace)) notFound();
  return <ModulePage role={workspace as WorkspaceRole} module={module} create={query.create === "1"} requestId={query.request}/>;
}
