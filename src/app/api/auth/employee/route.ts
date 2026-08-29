import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { workspaceFromDepartmentCode } from "@/lib/auth/employee-management";
import { isSupabaseUnavailable, unavailableResponse } from "@/lib/supabase/errors";

const bodySchema = z.object({ username: z.string().trim().min(3).max(80), password: z.string().min(8).max(256) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid username and password." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !publicKey) return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: identity, error: identityError } = await admin.rpc("employee_login_identity", { login_username: parsed.data.username.toLowerCase() });
  if (identityError) return isSupabaseUnavailable(identityError) ? unavailableResponse("Employee sign-in") : NextResponse.json({ error: "Employee sign-in could not be verified. Confirm that all Supabase migrations are applied." }, { status: 500 });
  if (!identity) return NextResponse.json({ error: "The username or password is incorrect." }, { status: 401 });
  const auth = createClient(url, publicKey, { auth: { persistSession: false } });
  const { data, error } = await auth.auth.signInWithPassword({ email: String(identity), password: parsed.data.password });
  if (error) return isSupabaseUnavailable(error) ? unavailableResponse("Employee sign-in") : NextResponse.json({ error: "The username or password is incorrect." }, { status: 401 });
  if (!data.session) return NextResponse.json({ error: "The username or password is incorrect." }, { status: 401 });
  const { data: profile } = await admin.from("users").select("department_id, account_kind").eq("id", data.user.id).single();
  const { data: department } = profile?.department_id ? await admin.from("departments").select("code").eq("id", profile.department_id).single() : { data: null };
  return NextResponse.json({ session: data.session, workspace: department?.code ? workspaceFromDepartmentCode(department.code) : "front-desk" });
}
