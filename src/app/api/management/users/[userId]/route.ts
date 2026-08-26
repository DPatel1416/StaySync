import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagementPermission } from "@/lib/auth/management";
import { createAdminClient } from "@/lib/supabase/admin";
import { employeeAuthEmail, employeeWorkspaces, prepareEmployeeAccess } from "@/lib/auth/employee-management";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,49}$/),
  password: z.string().min(8).max(256).optional().or(z.literal("")),
  workspace: z.enum(employeeWorkspaces),
  title: z.string().trim().min(2).max(100),
  propertyId: z.string().uuid(),
});

async function editableEmployee(admin: ReturnType<typeof createAdminClient>, organizationId: string, userId: string) {
  const { data } = await admin.from("users").select("id, account_kind, username").eq("id", userId).eq("organization_id", organizationId).is("archived_at", null).maybeSingle();
  return data?.account_kind === "EMPLOYEE" ? data : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const access = await requireManagementPermission("MANAGE_USERS");
  if ("error" in access) return access.error;
  const { userId } = await context.params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter valid employee account details." }, { status: 400 });
  if (!access.viewer.properties.some((property) => property.id === parsed.data.propertyId)) return NextResponse.json({ error: "You cannot manage users for that property." }, { status: 403 });
  const admin = createAdminClient();
  const employee = await editableEmployee(admin, access.viewer.organizationId, userId);
  if (!employee) return NextResponse.json({ error: "That employee account was not found." }, { status: 404 });
  try {
    const accessSetup = await prepareEmployeeAccess(admin, access.viewer.organizationId, parsed.data.propertyId, parsed.data.workspace, parsed.data.title);
    const authUpdates: { email?: string; password?: string; user_metadata: Record<string, unknown> } = { user_metadata: { display_name: parsed.data.name, account_kind: "EMPLOYEE", requires_password_change: Boolean(parsed.data.password) } };
    if (employee.username !== parsed.data.username) authUpdates.email = employeeAuthEmail(parsed.data.username, access.viewer.organizationId);
    if (parsed.data.password) authUpdates.password = parsed.data.password;
    const { error: authError } = await admin.auth.admin.updateUserById(userId, authUpdates);
    if (authError) throw authError;
    const { error: profileError } = await admin.from("users").update({ home_property_id: parsed.data.propertyId, department_id: accessSetup.departmentId, username: parsed.data.username, display_name: parsed.data.name, job_title: parsed.data.title, requires_password_change: Boolean(parsed.data.password), is_active: true }).eq("id", userId).eq("organization_id", access.viewer.organizationId);
    if (profileError) throw profileError;
    const { error: membershipDeleteError } = await admin.from("user_properties").delete().eq("user_id", userId);
    if (membershipDeleteError) throw membershipDeleteError;
    const { error: membershipError } = await admin.from("user_properties").insert({ user_id: userId, property_id: parsed.data.propertyId, role_id: accessSetup.roleId, is_default: true });
    if (membershipError) throw membershipError;
    return NextResponse.json({ updated: true });
  } catch (error) {
    const duplicate = error instanceof Error && /duplicate|already|registered/i.test(error.message);
    return NextResponse.json({ error: duplicate ? "That username is already in use." : "The employee account could not be updated." }, { status: duplicate ? 409 : 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const access = await requireManagementPermission("MANAGE_USERS");
  if ("error" in access) return access.error;
  const { userId } = await context.params;
  if (userId === access.viewer.id) return NextResponse.json({ error: "You cannot suspend your own account." }, { status: 400 });
  const admin = createAdminClient();
  const employee = await editableEmployee(admin, access.viewer.organizationId, userId);
  if (!employee) return NextResponse.json({ error: "That employee account was not found." }, { status: 404 });
  const { error: authError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
  if (authError) return NextResponse.json({ error: "The employee sign-in could not be suspended." }, { status: 500 });
  const { error } = await admin.from("users").update({ is_active: false, archived_at: new Date().toISOString() }).eq("id", userId).eq("organization_id", access.viewer.organizationId);
  if (error) return NextResponse.json({ error: "The employee profile could not be suspended." }, { status: 500 });
  return NextResponse.json({ suspended: true });
}
