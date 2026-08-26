import { notFound } from "next/navigation";
import { ModulePage } from "@/components/module-pages";
import { getAuthenticatedViewer, isLocalDemoMode } from "@/lib/auth/viewer";
import type { Permission, WorkspaceRole } from "@/lib/permissions";

const roles = new Set(["front-desk", "housekeeping", "maintenance", "manager"]);
const managerModulePermissions: Record<string, Permission> = {
  people: "MANAGE_USERS",
  properties: "MANAGE_PROPERTIES",
  reports: "VIEW_REPORTS",
  "quality-scores": "MANAGE_DEPARTMENT_SCORE",
  incidents: "VIEW_INCIDENT",
  "service-requests": "VIEW_SERVICE_REQUEST",
  "operations-log": "VIEW_REPORTS",
};
export default async function Page({ params, searchParams }: { params: Promise<{ workspace: string; module: string }>; searchParams: Promise<{ create?: string; request?: string }> }) {
  const { workspace, module } = await params;
  const query = await searchParams;
  if (!roles.has(workspace)) notFound();
  const viewer = await getAuthenticatedViewer();
  if (viewer && workspace === "manager") {
    const required = managerModulePermissions[module];
    if (required && !viewer.permissions.includes(required)) notFound();
  } else if (!viewer && !isLocalDemoMode()) notFound();
  return <ModulePage role={workspace as WorkspaceRole} module={module} create={query.create === "1"} requestId={query.request}/>;
}
