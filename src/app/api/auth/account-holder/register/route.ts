import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const registrationSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  organizationName: z.string().trim().min(2).max(120),
  propertyName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(256),
});

function codeFrom(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "PROPERTY";
}

export async function POST(request: Request) {
  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Complete every field and use a valid email and password." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Account creation is temporarily unavailable." }, { status: 503 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  let userId: string | undefined;
  let organizationId: string | undefined;
  try {
    const slug = `${codeFrom(parsed.data.organizationName).toLowerCase()}-${randomUUID().slice(0, 8)}`;
    const { data: organization, error: organizationError } = await admin.from("organizations").insert({ name: parsed.data.organizationName, slug }).select("id").single();
    if (organizationError || !organization) throw organizationError ?? new Error("Organization could not be created");
    organizationId = organization.id;
    const { data: property, error: propertyError } = await admin.from("properties").insert({ organization_id: organization.id, name: parsed.data.propertyName, code: codeFrom(parsed.data.propertyName) }).select("id").single();
    if (propertyError || !property) throw propertyError ?? new Error("Property could not be created");
    const { error: departmentsError } = await admin.from("departments").insert([
      { organization_id: organization.id, property_id: property.id, name: "Front Desk", code: "FRONT_DESK", accent_color: "indigo" },
      { organization_id: organization.id, property_id: property.id, name: "Housekeeping", code: "HOUSEKEEPING", accent_color: "teal" },
      { organization_id: organization.id, property_id: property.id, name: "Maintenance", code: "MAINTENANCE", accent_color: "amber" },
      { organization_id: organization.id, property_id: property.id, name: "Management", code: "MANAGEMENT", accent_color: "violet" },
    ]);
    if (departmentsError) throw departmentsError;
    const { data: role, error: roleError } = await admin.from("roles").insert({ organization_id: organization.id, name: "Account Holder", description: "Organization owner with administrative access" }).select("id").single();
    if (roleError || !role) throw roleError ?? new Error("Role could not be created");
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({ email: parsed.data.email.toLowerCase(), password: parsed.data.password, email_confirm: true, user_metadata: { display_name: parsed.data.displayName, account_kind: "ACCOUNT_HOLDER" } });
    if (authError || !authUser.user) throw authError ?? new Error("Account could not be created");
    userId = authUser.user.id;
    const { error: profileError } = await admin.from("users").insert({ id: userId, organization_id: organization.id, home_property_id: property.id, display_name: parsed.data.displayName, job_title: "Account Holder", account_kind: "ACCOUNT_HOLDER" });
    if (profileError) throw profileError;
    const { error: accessError } = await admin.from("user_properties").insert({ user_id: userId, property_id: property.id, role_id: role.id, is_default: true });
    if (accessError) throw accessError;
    const { data: permissions, error: permissionError } = await admin.from("permissions").select("id").in("code", ["MANAGE_USERS", "MANAGE_PROPERTIES", "VIEW_REPORTS", "MANAGE_DEPARTMENT_SCORE"]);
    if (permissionError) throw permissionError;
    if (permissions?.length) {
      const { error: rolePermissionError } = await admin.from("role_permissions").insert(permissions.map((permission) => ({ role_id: role.id, permission_id: permission.id })));
      if (rolePermissionError) throw rolePermissionError;
    }
    return NextResponse.json({ created: true }, { status: 201 });
  } catch {
    if (userId) await admin.auth.admin.deleteUser(userId);
    if (organizationId) await admin.from("organizations").delete().eq("id", organizationId);
    return NextResponse.json({ error: "We could not create this account. The email may already be registered." }, { status: 409 });
  }
}
