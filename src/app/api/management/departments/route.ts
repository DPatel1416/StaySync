import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagementPermission } from "@/lib/auth/management";
import { createAdminClient } from "@/lib/supabase/admin";
import { workspaceFromDepartmentCode } from "@/lib/auth/employee-management";

const schema = z.object({ name: z.string().trim().min(2).max(80), propertyId: z.string().uuid() });

export async function GET() {
  const access = await requireManagementPermission("MANAGE_USERS");
  if ("error" in access) return access.error;
  const admin = createAdminClient();
  const propertyIds = access.viewer.properties.map((property) => property.id);
  const { data, error } = propertyIds.length ? await admin.from("departments").select("id, name, code, property_id").eq("organization_id", access.viewer.organizationId).in("property_id", propertyIds).is("archived_at", null).order("name") : { data: [], error: null };
  if (error) return NextResponse.json({ error: "Departments could not be loaded." }, { status: 500 });
  return NextResponse.json({ departments: (data ?? []).map((department) => ({ id: department.id, name: department.name, workspace: workspaceFromDepartmentCode(department.code), propertyId: department.property_id })) });
}

export async function POST(request: Request) {
  const access = await requireManagementPermission("MANAGE_USERS");
  if ("error" in access) return access.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid department name and property." }, { status: 400 });
  if (!access.viewer.properties.some((property) => property.id === parsed.data.propertyId)) return NextResponse.json({ error: "You cannot add departments to that property." }, { status: 403 });
  const slug = parsed.data.name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const code = `CUSTOM_${slug.replace(/-/g, "_").toUpperCase()}`;
  const admin = createAdminClient();
  const { data, error } = await admin.from("departments").insert({ organization_id: access.viewer.organizationId, property_id: parsed.data.propertyId, name: parsed.data.name, code }).select("id, name, code, property_id").single();
  if (error || !data) {
    const duplicate = /duplicate|unique/i.test(error?.message ?? "");
    return NextResponse.json({ error: duplicate ? "That department already exists for this property." : "The department could not be added." }, { status: duplicate ? 409 : 500 });
  }
  return NextResponse.json({ department: { id: data.id, name: data.name, workspace: workspaceFromDepartmentCode(data.code), propertyId: data.property_id } }, { status: 201 });
}
