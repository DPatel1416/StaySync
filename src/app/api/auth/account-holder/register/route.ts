import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isDuplicateIdentityError, isSupabaseUnavailable, unavailableResponse } from "@/lib/supabase/errors";

const registrationSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(256),
});

export async function POST(request: Request) {
  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your name, a valid email, and a password with at least 8 characters." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Account creation is temporarily unavailable." }, { status: 503 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  let userId: string | undefined;
  let organizationId: string | undefined;
  try {
    const setupId = randomUUID().slice(0, 8);
    const { data: organization, error: organizationError } = await admin.from("organizations").insert({ name: "Property setup pending", slug: `setup-${setupId}` }).select("id").single();
    if (organizationError || !organization) throw organizationError ?? new Error("Organization could not be prepared");
    organizationId = organization.id;

    const { data: role, error: roleError } = await admin.from("roles").insert({ organization_id: organization.id, name: "Account Holder", description: "Organization owner with administrative access" }).select("id").single();
    if (roleError || !role) throw roleError ?? new Error("Role could not be created");

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({ email: parsed.data.email.toLowerCase(), password: parsed.data.password, email_confirm: true, user_metadata: { display_name: parsed.data.displayName, account_kind: "ACCOUNT_HOLDER", onboarding_complete: false } });
    if (authError || !authUser.user) throw authError ?? new Error("Account could not be created");
    userId = authUser.user.id;

    const { error: profileError } = await admin.from("users").insert({ id: userId, organization_id: organization.id, display_name: parsed.data.displayName, job_title: "Account Holder", account_kind: "ACCOUNT_HOLDER" });
    if (profileError) throw profileError;

    const { data: permissions, error: permissionError } = await admin.from("permissions").select("id").in("code", ["MANAGE_USERS", "MANAGE_PROPERTIES", "VIEW_REPORTS", "MANAGE_DEPARTMENT_SCORE"]);
    if (permissionError) throw permissionError;
    if (permissions?.length) {
      const { error: rolePermissionError } = await admin.from("role_permissions").insert(permissions.map((permission) => ({ role_id: role.id, permission_id: permission.id })));
      if (rolePermissionError) throw rolePermissionError;
    }
    return NextResponse.json({ created: true, requiresOnboarding: true }, { status: 201 });
  } catch (caught) {
    if (userId) await admin.auth.admin.deleteUser(userId);
    if (organizationId) await admin.from("organizations").delete().eq("id", organizationId);
    if (isSupabaseUnavailable(caught)) return unavailableResponse("Account creation");
    if (isDuplicateIdentityError(caught)) return NextResponse.json({ error: "That email is already registered. Sign in instead or use a different email." }, { status: 409 });
    return NextResponse.json({ error: "We could not create the account because its database setup failed. Confirm that all Supabase migrations are applied, then try again." }, { status: 500 });
  }
}
