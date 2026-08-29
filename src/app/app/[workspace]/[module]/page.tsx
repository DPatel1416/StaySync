import { notFound } from "next/navigation";
import { ModulePage } from "@/components/module-pages";
import { getAuthenticatedViewer } from "@/lib/auth/viewer";
import type { Permission, WorkspaceRole } from "@/lib/permissions";

const roles = new Set(["front-desk", "housekeeping", "maintenance", "food-beverage", "manager"]);
const allowedModules: Partial<Record<WorkspaceRole, Set<string>>> = {
  "food-beverage": new Set(["operations-log", "incidents", "settings"]),
};
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
  if (!roles.has(workspace) && !workspace.startsWith("department-")) notFound();
  const workspaceRole = workspace as WorkspaceRole;
  if (workspace.startsWith("department-") && !new Set(["operations-log", "incidents", "settings"]).has(module)) notFound();
  if (allowedModules[workspaceRole] && !allowedModules[workspaceRole]!.has(module)) notFound();
  const viewer = await getAuthenticatedViewer();
  if (viewer && workspace === "manager") {
    const required = managerModulePermissions[module];
    if (required && !viewer.permissions.includes(required)) notFound();
  } else if (!viewer) notFound();
  return <ModulePage role={workspaceRole} module={module} create={query.create === "1"} requestId={query.request} viewer={viewer}/>;
}
