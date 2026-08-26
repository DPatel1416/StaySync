import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { rolePermissions, type Permission, type WorkspaceRole } from "@/lib/permissions";

export const employeeWorkspaces = ["front-desk", "housekeeping", "maintenance"] as const;
export type EmployeeWorkspace = (typeof employeeWorkspaces)[number];

export const departmentCodeByWorkspace: Record<EmployeeWorkspace, string> = {
  "front-desk": "FRONT_DESK",
  housekeeping: "HOUSEKEEPING",
  maintenance: "MAINTENANCE",
};

function permissionsFor(title: string, workspace: EmployeeWorkspace): Permission[] {
  const permissions = [...rolePermissions[workspace]];
  if (/supervisor/i.test(title) && !permissions.includes("ASSIGN_SERVICE_REQUEST")) permissions.push("ASSIGN_SERVICE_REQUEST");
  return permissions;
}

export async function prepareEmployeeAccess(admin: SupabaseClient, organizationId: string, propertyId: string, workspace: EmployeeWorkspace, title: string) {
  const { data: property, error: propertyError } = await admin.from("properties").select("id").eq("id", propertyId).eq("organization_id", organizationId).is("archived_at", null).single();
  if (propertyError || !property) throw propertyError ?? new Error("The selected property is not available.");
  const { data: department, error: departmentError } = await admin.from("departments").select("id").eq("organization_id", organizationId).eq("property_id", propertyId).eq("code", departmentCodeByWorkspace[workspace]).is("archived_at", null).single();
  if (departmentError || !department) throw departmentError ?? new Error("The selected department is not configured for this property.");

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
