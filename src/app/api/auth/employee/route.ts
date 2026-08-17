import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const bodySchema = z.object({ username: z.string().trim().min(3).max(80), password: z.string().min(8).max(256) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid username and password." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: identity, error: identityError } = await admin.rpc("employee_login_identity", { login_username: parsed.data.username.toLowerCase() });
  if (identityError || !identity) return NextResponse.json({ error: "The username or password is incorrect." }, { status: 401 });
  const auth = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await auth.auth.signInWithPassword({ email: String(identity), password: parsed.data.password });
  if (error || !data.session) return NextResponse.json({ error: "The username or password is incorrect." }, { status: 401 });
  return NextResponse.json({ session: data.session, requiresPasswordChange: Boolean(data.user.user_metadata.requires_password_change) });
}
