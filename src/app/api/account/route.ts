import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getAuthenticatedViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";

const profileSchema = z.object({ action: z.literal("profile"), name: z.string().trim().min(2).max(100), username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,49}$/).optional(), email: z.string().trim().email().max(254).optional() });
const passwordSchema = z.object({ action: z.literal("password"), currentPassword: z.string().min(8).max(256), newPassword: z.string().min(8).max(256) });
const requestSchema = z.discriminatedUnion("action", [profileSchema, passwordSchema]);

export async function GET() {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(viewer.id);
  if (error || !data.user) return NextResponse.json({ error: "Account settings could not be loaded." }, { status: 500 });
  return NextResponse.json({ account: { name: viewer.name, title: viewer.title, username: viewer.username, email: viewer.accountKind === "ACCOUNT_HOLDER" ? data.user.email ?? "" : "", accountKind: viewer.accountKind } });
}

export async function PATCH(request: Request) {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter valid account details." }, { status: 400 });
  const admin = createAdminClient();
  const { data: authRecord, error: authRecordError } = await admin.auth.admin.getUserById(viewer.id);
  if (authRecordError || !authRecord.user?.email) return NextResponse.json({ error: "Your account could not be verified." }, { status: 500 });

  if (parsed.data.action === "password") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !publicKey) return NextResponse.json({ error: "Password updates are temporarily unavailable." }, { status: 503 });
    const verifier = createSupabaseClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: verifyError } = await verifier.auth.signInWithPassword({ email: authRecord.user.email, password: parsed.data.currentPassword });
    if (verifyError) return NextResponse.json({ error: "The current password is incorrect." }, { status: 400 });
    const { error } = await admin.auth.admin.updateUserById(viewer.id, { password: parsed.data.newPassword, user_metadata: { ...authRecord.user.user_metadata, requires_password_change: false } });
    if (error) return NextResponse.json({ error: "Your password could not be updated." }, { status: 500 });
    await admin.from("users").update({ requires_password_change: false }).eq("id", viewer.id).eq("organization_id", viewer.organizationId);
    return NextResponse.json({ updated: true });
  }

  if (viewer.accountKind === "ACCOUNT_HOLDER" && !parsed.data.email) return NextResponse.json({ error: "Email is required for the account holder." }, { status: 400 });
  const username = viewer.accountKind === "EMPLOYEE" ? parsed.data.username : undefined;
  const { error: profileError } = await admin.from("users").update({ display_name: parsed.data.name, ...(username ? { username } : {}) }).eq("id", viewer.id).eq("organization_id", viewer.organizationId);
  if (profileError) return NextResponse.json({ error: /duplicate/i.test(profileError.message) ? "That username is already in use." : "Your profile could not be updated." }, { status: /duplicate/i.test(profileError.message) ? 409 : 500 });
  const { error: authError } = await admin.auth.admin.updateUserById(viewer.id, { ...(viewer.accountKind === "ACCOUNT_HOLDER" ? { email: parsed.data.email, email_confirm: true } : {}), user_metadata: { ...authRecord.user.user_metadata, display_name: parsed.data.name, ...(username ? { username } : {}) } });
  if (authError) return NextResponse.json({ error: "Your sign-in identity could not be updated." }, { status: 500 });
  return NextResponse.json({ updated: true });
}
