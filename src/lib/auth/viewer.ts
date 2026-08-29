import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Permission, WorkspaceRole } from "@/lib/permissions";
import { workspaceFromDepartmentCode } from "./employee-management";

export type ViewerProperty = { id: string; name: string; isDefault: boolean };

export type AuthenticatedViewer = {
  id: string;
  organizationId: string;
  name: string;
  title: string;
  username: string;
  workspace: WorkspaceRole;
  isSupervisor: boolean;
  accountKind: "EMPLOYEE" | "ACCOUNT_HOLDER";
  properties: ViewerProperty[];
  permissions: Permission[];
};

export async function getAuthenticatedViewer(): Promise<AuthenticatedViewer | null> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id, organization_id, display_name, username, job_title, account_kind, is_active, archived_at, department_id")
    .eq("id", authData.user.id)
    .single();
  if (profileError || !profile || !profile.is_active || profile.archived_at) return null;

  const { data: department } = profile.department_id
    ? await admin.from("departments").select("code").eq("id", profile.department_id).maybeSingle()
    : { data: null };
  const workspace: WorkspaceRole = profile.account_kind === "ACCOUNT_HOLDER"
    ? "manager"
    : department?.code ? workspaceFromDepartmentCode(department.code) : "front-desk";

  const { data: memberships } = await admin
    .from("user_properties")
    .select("property_id, role_id, is_default, properties(name)")
    .eq("user_id", authData.user.id);
  const roleIds = [...new Set((memberships ?? []).map((membership) => membership.role_id))];
  const { data: rolePermissions } = roleIds.length
    ? await admin.from("role_permissions").select("permissions(code)").in("role_id", roleIds)
    : { data: [] };

  const permissions = [...new Set((rolePermissions ?? []).flatMap((entry) => {
    const permission = Array.isArray(entry.permissions) ? entry.permissions[0] : entry.permissions;
    return permission?.code ? [permission.code as Permission] : [];
  }))];
  const properties = (memberships ?? []).map((membership) => {
    const property = Array.isArray(membership.properties) ? membership.properties[0] : membership.properties;
    return { id: membership.property_id, name: property?.name ?? "Assigned property", isDefault: membership.is_default };
  }).sort((left, right) => Number(right.isDefault) - Number(left.isDefault));

  return {
    id: profile.id,
    organizationId: profile.organization_id,
    name: profile.display_name,
    title: profile.account_kind === "ACCOUNT_HOLDER" ? "General Manager" : profile.job_title || "Hotel employee",
    username: profile.username ?? "",
    workspace,
    isSupervisor: workspace === "manager" || /supervisor|manager/i.test(profile.job_title ?? ""),
    accountKind: profile.account_kind,
    properties,
    permissions,
  };
}
