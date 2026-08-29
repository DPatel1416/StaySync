import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagementPermission, managementError } from "@/lib/auth/management";
import { createAdminClient } from "@/lib/supabase/admin";
import { employeeAuthEmail, prepareEmployeeAccess, workspaceFromDepartmentCode } from "@/lib/auth/employee-management";
import type { WorkspaceRole } from "@/lib/permissions";
import { isDuplicateIdentityError, isSupabaseUnavailable, unavailableResponse } from "@/lib/supabase/errors";

const employeeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,49}$/),
  password: z.string().min(8).max(256),
  workspace: z.string().regex(/^(front-desk|housekeeping|maintenance|food-beverage|department-[a-z0-9-]+)$/),
  title: z.string().trim().min(2).max(100),
  propertyId: z.string().uuid(),
});

export async function GET() {
  const access = await requireManagementPermission("MANAGE_USERS");
  if ("error" in access) return access.error;
  const admin = createAdminClient();
  const { data: profiles, error } = await admin.from("users").select("id, display_name, username, job_title, account_kind, is_active, requires_password_change, home_property_id, department_id").eq("organization_id", access.viewer.organizationId).is("archived_at", null).order("display_name");
  if (error) return managementError(error, "Users could not be loaded.");
  const propertyIds = [...new Set(profiles.map((profile) => profile.home_property_id).filter(Boolean))];
  const departmentIds = [...new Set(profiles.map((profile) => profile.department_id).filter(Boolean))];
  const [{ data: properties }, { data: departments }] = await Promise.all([
    propertyIds.length ? admin.from("properties").select("id, name").in("id", propertyIds) : Promise.resolve({ data: [] }),
    departmentIds.length ? admin.from("departments").select("id, code").in("id", departmentIds) : Promise.resolve({ data: [] }),
  ]);
  const propertyById = new Map((properties ?? []).map((property) => [property.id, property.name]));
  const departmentById = new Map((departments ?? []).map((department) => [department.id, workspaceFromDepartmentCode(department.code)]));
  return NextResponse.json({ users: profiles.map((profile) => ({
    id: profile.id,
    name: profile.display_name,
    username: profile.username ?? "",
    workspace: profile.account_kind === "ACCOUNT_HOLDER" ? "manager" : departmentById.get(profile.department_id) ?? "front-desk",
    title: profile.job_title ?? "Hotel employee",
    propertyId: profile.home_property_id,
    property: propertyById.get(profile.home_property_id) ?? "Property setup pending",
    status: profile.is_active ? profile.requires_password_change ? "Temporary password" : "Active" : "Suspended",
    primaryAccount: profile.account_kind === "ACCOUNT_HOLDER",
  })) });
}

export async function POST(request: Request) {
  const access = await requireManagementPermission("MANAGE_USERS");
  if ("error" in access) return access.error;
  const parsed = employeeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid name, username, temporary password, property, department, and job title." }, { status: 400 });
  if (!access.viewer.properties.some((property) => property.id === parsed.data.propertyId)) return NextResponse.json({ error: "You cannot create users for that property." }, { status: 403 });
  const admin = createAdminClient();
  let authUserId: string | undefined;
  try {
    const accessSetup = await prepareEmployeeAccess(admin, access.viewer.organizationId, parsed.data.propertyId, parsed.data.workspace as WorkspaceRole, parsed.data.title);
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: employeeAuthEmail(parsed.data.username, access.viewer.organizationId),
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { display_name: parsed.data.name, username: parsed.data.username, account_kind: "EMPLOYEE", requires_password_change: true },
    });
    if (authError || !authUser.user) throw authError ?? new Error("The employee sign-in could not be created.");
    authUserId = authUser.user.id;
    const { error: profileError } = await admin.from("users").insert({ id: authUserId, organization_id: access.viewer.organizationId, home_property_id: parsed.data.propertyId, department_id: accessSetup.departmentId, username: parsed.data.username, display_name: parsed.data.name, job_title: parsed.data.title, account_kind: "EMPLOYEE", requires_password_change: true });
    if (profileError) throw profileError;
    const { error: membershipError } = await admin.from("user_properties").insert({ user_id: authUserId, property_id: parsed.data.propertyId, role_id: accessSetup.roleId, is_default: true });
    if (membershipError) throw membershipError;
    return NextResponse.json({ user: { id: authUserId, name: parsed.data.name, username: parsed.data.username, workspace: parsed.data.workspace, title: parsed.data.title, propertyId: parsed.data.propertyId, property: access.viewer.properties.find((property) => property.id === parsed.data.propertyId)?.name, status: "Temporary password", primaryAccount: false } }, { status: 201 });
  } catch (error) {
    if (authUserId) await admin.auth.admin.deleteUser(authUserId);
    if (isSupabaseUnavailable(error)) return unavailableResponse("Employee creation");
    if (isDuplicateIdentityError(error)) return NextResponse.json({ error: "That username is already in use." }, { status: 409 });
    return NextResponse.json({ error: "The employee account could not be created. Confirm that the database migrations are current and the selected department exists." }, { status: 500 });
  }
}
