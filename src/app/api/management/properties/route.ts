import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagementPermission, managementError } from "@/lib/auth/management";
import { createAdminClient } from "@/lib/supabase/admin";

const propertySchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,16}$/),
  city: z.string().trim().min(2).max(100),
  region: z.string().trim().min(2).max(100),
  address: z.string().trim().max(200).optional().default(""),
  postalCode: z.string().trim().max(20).optional().default(""),
  rooms: z.coerce.number().int().min(1).max(10000),
  timezone: z.string().trim().min(3).max(80),
  status: z.enum(["Active", "Pre-opening", "Temporarily closed"]).default("Active"),
});

export async function GET() {
  const access = await requireManagementPermission("MANAGE_PROPERTIES");
  if ("error" in access) return access.error;
  const admin = createAdminClient();
  const { data, error } = await admin.from("properties").select("id, name, code, timezone, address, room_count, operational_status").eq("organization_id", access.viewer.organizationId).is("archived_at", null).order("name");
  if (error) return managementError(error, "Properties could not be loaded.");
  return NextResponse.json({ properties: data.map((property) => ({
    id: property.id,
    name: property.name,
    code: property.code,
    timezone: property.timezone,
    rooms: property.room_count,
    location: [property.address?.city, property.address?.region].filter(Boolean).join(", ") || "Location not added",
    status: property.operational_status === "PRE_OPENING" ? "Pre-opening" : property.operational_status === "TEMPORARILY_CLOSED" ? "Temporarily closed" : "Active",
  })) });
}

export async function POST(request: Request) {
  const access = await requireManagementPermission("MANAGE_PROPERTIES");
  if ("error" in access) return access.error;
  const parsed = propertySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter valid property details, including a unique property code and room count." }, { status: 400 });
  const admin = createAdminClient();
  const draft = parsed.data;
  let propertyId: string | undefined;
  try {
    const { data: property, error } = await admin.from("properties").insert({
      organization_id: access.viewer.organizationId,
      name: draft.name,
      code: draft.code,
      timezone: draft.timezone,
      room_count: draft.rooms,
      address: { line1: draft.address, city: draft.city, region: draft.region, postal_code: draft.postalCode },
      operational_status: draft.status === "Pre-opening" ? "PRE_OPENING" : draft.status === "Temporarily closed" ? "TEMPORARILY_CLOSED" : "ACTIVE",
    }).select("id, name, code, timezone, address, room_count").single();
    if (error || !property) throw error ?? new Error("Property could not be created.");
    propertyId = property.id;

    const departments = [
      { name: "Front Desk", code: "FRONT_DESK", accent_color: "indigo" },
      { name: "Housekeeping", code: "HOUSEKEEPING", accent_color: "teal" },
      { name: "Maintenance", code: "MAINTENANCE", accent_color: "amber" },
      { name: "Food & Beverage", code: "FOOD_BEVERAGE", accent_color: "sky" },
      { name: "Management", code: "MANAGEMENT", accent_color: "slate" },
    ].map((department) => ({ ...department, organization_id: access.viewer.organizationId, property_id: property.id }));
    const { error: departmentError } = await admin.from("departments").insert(departments);
    if (departmentError) throw departmentError;

    const { data: role, error: roleError } = await admin.from("roles").select("id").eq("organization_id", access.viewer.organizationId).eq("name", "Account Holder").single();
    if (roleError || !role) throw roleError ?? new Error("Account Holder role is missing.");
    const { error: membershipError } = await admin.from("user_properties").insert({ user_id: access.viewer.id, property_id: property.id, role_id: role.id, is_default: access.viewer.properties.length === 0 });
    if (membershipError) throw membershipError;
    return NextResponse.json({ property: { id: property.id, name: property.name, code: property.code, timezone: property.timezone, rooms: property.room_count, location: `${draft.city}, ${draft.region}`, status: draft.status } }, { status: 201 });
  } catch (error) {
    if (propertyId) await admin.from("properties").delete().eq("id", propertyId).eq("organization_id", access.viewer.organizationId);
    return managementError(error, "The property could not be created. Check that its code is unique.");
  }
}
