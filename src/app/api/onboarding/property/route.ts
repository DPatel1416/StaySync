import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const propertySetupSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  propertyName: z.string().trim().min(2).max(120),
  roomCount: z.number().int().min(1).max(10000),
  addressLine: z.string().trim().max(160).optional().default(""),
  city: z.string().trim().min(2).max(100),
  region: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().max(20).optional().default(""),
  country: z.string().trim().min(2).max(100),
});

function codeFrom(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "PROPERTY";
}

export async function POST(request: Request) {
  const parsed = propertySetupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Complete the required property details and enter a valid room count." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !serviceKey || !token) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  const { data: profile, error: profileError } = await admin.from("users").select("organization_id, home_property_id, account_kind").eq("id", authData.user.id).single();
  if (profileError || !profile || profile.account_kind !== "ACCOUNT_HOLDER") return NextResponse.json({ error: "This account cannot configure a property." }, { status: 403 });
  if (profile.home_property_id) return NextResponse.json({ error: "Property setup is already complete." }, { status: 409 });

  let propertyId: string | undefined;
  try {
    const slug = `${codeFrom(parsed.data.organizationName).toLowerCase()}-${randomUUID().slice(0, 8)}`;
    const { error: organizationError } = await admin.from("organizations").update({ name: parsed.data.organizationName, slug }).eq("id", profile.organization_id);
    if (organizationError) throw organizationError;

    const address = { line1: parsed.data.addressLine, city: parsed.data.city, region: parsed.data.region, postalCode: parsed.data.postalCode, country: parsed.data.country };
    const { data: property, error: propertyError } = await admin.from("properties").insert({ organization_id: profile.organization_id, name: parsed.data.propertyName, code: codeFrom(parsed.data.propertyName), room_count: parsed.data.roomCount, address }).select("id").single();
    if (propertyError || !property) throw propertyError ?? new Error("Property could not be created");
    propertyId = property.id;

    const { error: departmentsError } = await admin.from("departments").insert([
      { organization_id: profile.organization_id, property_id: property.id, name: "Front Desk", code: "FRONT_DESK", accent_color: "indigo" },
      { organization_id: profile.organization_id, property_id: property.id, name: "Housekeeping", code: "HOUSEKEEPING", accent_color: "teal" },
      { organization_id: profile.organization_id, property_id: property.id, name: "Maintenance", code: "MAINTENANCE", accent_color: "amber" },
      { organization_id: profile.organization_id, property_id: property.id, name: "Food & Beverage", code: "FOOD_BEVERAGE", accent_color: "sky" },
      { organization_id: profile.organization_id, property_id: property.id, name: "Management", code: "MANAGEMENT", accent_color: "violet" },
    ]);
    if (departmentsError) throw departmentsError;

    const { data: role, error: roleError } = await admin.from("roles").select("id").eq("organization_id", profile.organization_id).in("name", ["General Manager", "Account Holder"]).limit(1).single();
    if (roleError || !role) throw roleError ?? new Error("General Manager role was not found");
    const { error: accessError } = await admin.from("user_properties").insert({ user_id: authData.user.id, property_id: property.id, role_id: role.id, is_default: true });
    if (accessError) throw accessError;
    const { error: userError } = await admin.from("users").update({ home_property_id: property.id }).eq("id", authData.user.id);
    if (userError) throw userError;
    await admin.auth.admin.updateUserById(authData.user.id, { user_metadata: { ...authData.user.user_metadata, onboarding_complete: true } });
    return NextResponse.json({ completed: true, propertyId: property.id }, { status: 201 });
  } catch {
    if (propertyId) await admin.from("properties").delete().eq("id", propertyId);
    return NextResponse.json({ error: "We could not finish property setup. Please review the details and try again." }, { status: 409 });
  }
}
