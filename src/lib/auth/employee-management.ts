import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { rolePermissions, type BuiltInWorkspaceRole, type Permission, type WorkspaceRole } from "@/lib/permissions";

export const employeeWorkspaces = ["front-desk", "housekeeping", "maintenance", "food-beverage"] as const;
export type EmployeeWorkspace = (typeof employeeWorkspaces)[number];

export const departmentCodeByWorkspace: Record<EmployeeWorkspace, string> = {
  "front-desk": "FRONT_DESK",
  housekeeping: "HOUSEKEEPING",
  maintenance: "MAINTENANCE",
  "food-beverage": "FOOD_BEVERAGE",
};

export function workspaceFromDepartmentCode(code: string): WorkspaceRole {
  const builtIn = Object.entries(departmentCodeByWorkspace).find(([, value]) => value === code)?.[0] as EmployeeWorkspace | undefined;
  return builtIn ?? `department-${code.toLowerCase().replace(/^custom_/, "").replace(/_/g, "-")}`;
}

export function departmentCodeFromWorkspace(workspace: WorkspaceRole) {
  return departmentCodeByWorkspace[workspace as EmployeeWorkspace] ?? `CUSTOM_${workspace.replace(/^department-/, "").replace(/-/g, "_").toUpperCase()}`;
}

function permissionsFor(title: string, workspace: WorkspaceRole): Permission[] {
  const permissions = [...(rolePermissions[workspace as BuiltInWorkspaceRole] ?? ["CREATE_INCIDENT", "VIEW_INCIDENT", "CREATE_OPERATION_LOG"])] as Permission[];
  if (/supervisor/i.test(title) && !permissions.includes("ASSIGN_SERVICE_REQUEST")) permissions.push("ASSIGN_SERVICE_REQUEST");
  return permissions;
}

export async function prepareEmployeeAccess(admin: SupabaseClient, organizationId: string, propertyId: string, workspace: WorkspaceRole, title: string) {
  const { data: property, error: propertyError } = await admin.from("properties").select("id").eq("id", propertyId).eq("organization_id", organizationId).is("archived_at", null).single();
  if (propertyError || !property) throw propertyError ?? new Error("The selected property is not available.");
  let { data: department, error: departmentError } = await admin.from("departments").select("id").eq("organization_id", organizationId).eq("property_id", propertyId).eq("code", departmentCodeFromWorkspace(workspace)).is("archived_at", null).maybeSingle();
  if (departmentError) throw departmentError;
  if (!department && workspace.startsWith("department-")) {
    const name = workspace.replace(/^department-/, "").split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
    const created = await admin.from("departments").insert({ organization_id: organizationId, property_id: propertyId, name, code: departmentCodeFromWorkspace(workspace) }).select("id").single();
    if (created.error || !created.data) throw created.error ?? new Error("The department could not be created.");
    department = created.data;
  }
  if (!department) throw new Error("The selected department is not configured for this property.");

  let { data: role, error: roleError } = await admin.from("roles").select("id").eq("organization_id", organizationId).eq("name", title).maybeSingle();
  if (roleError) throw roleError;
  if (!role) {
    const created = await admin.from("roles").insert({ organization_id: organizationId, name: title, description: `${title} access managed by StaySync` }).select("id").single();
    if (created.error || !created.data) throw created.error ?? new Error("The employee role could not be created.");
    role = created.data;
  }

  const { data: permissions, error: permissionError } = await admin.from("permissions").select("id, code").in("code", permissionsFor(title, workspace));
  if (permissionError) throw permissionError;
  if (permissions?.length) {
    const { error } = await admin.from("role_permissions").upsert(permissions.map((permission) => ({ role_id: role!.id, permission_id: permission.id })), { onConflict: "role_id,permission_id", ignoreDuplicates: true });
    if (error) throw error;
  }
  return { departmentId: department.id, roleId: role.id };
}

export function employeeAuthEmail(username: string, organizationId: string) {
  return `${username}.${organizationId.slice(0, 8)}@employees.staysync.app`;
}
