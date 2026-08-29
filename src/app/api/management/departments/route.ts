import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagementPermission } from "@/lib/auth/management";
import { createAdminClient } from "@/lib/supabase/admin";
import { workspaceFromDepartmentCode } from "@/lib/auth/employee-management";

const schema = z.object({ name: z.string().trim().min(2).max(80), propertyId: z.string().uuid() });
const deleteSchema = z.object({ departmentId: z.string().uuid() });
const protectedDepartmentCodes = new Set(["FRONT_DESK", "HOUSEKEEPING", "MAINTENANCE", "FOOD_BEVERAGE", "MANAGEMENT"]);

export async function GET() {
  const access = await requireManagementPermission("MANAGE_USERS");
  if ("error" in access) return access.error;
  const admin = createAdminClient();
  const propertyIds = access.viewer.properties.map((property) => property.id);
  const { data, error } = propertyIds.length ? await admin.from("departments").select("id, name, code, property_id").eq("organization_id", access.viewer.organizationId).in("property_id", propertyIds).is("archived_at", null).order("name") : { data: [], error: null };
  if (error) return NextResponse.json({ error: "Departments could not be loaded." }, { status: 500 });
  return NextResponse.json({ departments: (data ?? []).filter((department) => department.code !== "MANAGEMENT").map((department) => ({ id: department.id, name: department.name, workspace: workspaceFromDepartmentCode(department.code), propertyId: department.property_id, builtIn: protectedDepartmentCodes.has(department.code) })) });
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
  return NextResponse.json({ department: { id: data.id, name: data.name, workspace: workspaceFromDepartmentCode(data.code), propertyId: data.property_id, builtIn: false } }, { status: 201 });
}

export async function DELETE(request: Request) {
  const access = await requireManagementPermission("MANAGE_USERS");
  if ("error" in access) return access.error;
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select a valid department to delete." }, { status: 400 });

  const admin = createAdminClient();
  const { data: department, error: departmentError } = await admin
    .from("departments")
    .select("id, property_id, code")
    .eq("id", parsed.data.departmentId)
    .eq("organization_id", access.viewer.organizationId)
    .is("archived_at", null)
    .maybeSingle();
  if (departmentError) return NextResponse.json({ error: "The department could not be checked." }, { status: 500 });
  if (!department || !access.viewer.properties.some((property) => property.id === department.property_id)) {
    return NextResponse.json({ error: "That department is not available to your account." }, { status: 404 });
  }
  if (protectedDepartmentCodes.has(department.code)) {
    return NextResponse.json({ error: "StaySync's default departments cannot be deleted." }, { status: 409 });
  }

  const { count, error: userError } = await admin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", access.viewer.organizationId)
    .eq("department_id", department.id)
    .eq("is_active", true)
    .is("archived_at", null);
  if (userError) return NextResponse.json({ error: "Department assignments could not be checked." }, { status: 500 });
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Reassign or suspend this department's active users before deleting it." }, { status: 409 });
  }

  const { error } = await admin
    .from("departments")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", department.id)
    .eq("organization_id", access.viewer.organizationId);
  if (error) return NextResponse.json({ error: "The department could not be deleted." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
