import { NextResponse } from "next/server";
import { getAuthenticatedViewer, type AuthenticatedViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Permission } from "@/lib/permissions";
import { departmentCodeFromWorkspace } from "@/lib/auth/employee-management";

const resources = new Set(["service-requests", "incidents", "work-orders", "room-updates", "housekeeping-rooms", "operation-logs", "notifications", "department-scores", "employees", "lost-found", "departments"]);
type Admin = ReturnType<typeof createAdminClient>;

function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
function resourceFrom(request: Request) { const value = new URL(request.url).searchParams.get("resource") ?? ""; return resources.has(value) ? value : null; }
function statusLabel(value: string) { return value.split("_").map((part) => part[0] + part.slice(1).toLowerCase()).join(" "); }
function enumValue(value: unknown, fallback = "STANDARD") { return String(value || fallback).trim().toUpperCase().replace(/\s+/g, "_"); }
function isMissingPreviousScore(error: { code?: string; message?: string } | null) {
  return Boolean(error && ["42703", "PGRST204"].includes(error.code ?? "") && /previous_score/i.test(error.message ?? ""));
}

const readPermissions: Partial<Record<string, Permission>> = {
  "service-requests": "VIEW_SERVICE_REQUEST", incidents: "VIEW_INCIDENT",
  "work-orders": "VIEW_WORK_ORDER", "room-updates": "VIEW_ROOM_STATUS",
  "housekeeping-rooms": "VIEW_ROOM_STATUS", "operation-logs": "CREATE_OPERATION_LOG",
  "lost-found": "VIEW_LOST_FOUND",
};
const createPermissions: Partial<Record<string, Permission>> = {
  "service-requests": "CREATE_SERVICE_REQUEST", incidents: "CREATE_INCIDENT",
  "work-orders": "CREATE_WORK_ORDER", "room-updates": "UPDATE_ROOM_STATUS",
  "housekeeping-rooms": "UPDATE_ROOM_STATUS", "operation-logs": "CREATE_OPERATION_LOG",
  "department-scores": "MANAGE_DEPARTMENT_SCORE",
  "lost-found": "VIEW_LOST_FOUND",
};
function authorized(viewer: AuthenticatedViewer, permission?: Permission) {
  return !permission || viewer.permissions.includes(permission);
}

async function context(viewer: AuthenticatedViewer, admin: Admin, requestedProperty?: string) {
  const property = viewer.properties.find((item) => item.id === requestedProperty || item.name === requestedProperty) ?? viewer.properties[0];
  if (!property) throw new Error("No authorized property is assigned to this account.");
  const { data: department } = await admin.from("departments").select("id, name").eq("organization_id", viewer.organizationId).eq("property_id", property.id).eq("code", viewer.workspace === "manager" ? "MANAGEMENT" : viewer.workspace.replace(/^department-/, "CUSTOM_").replace(/-/g, "_").toUpperCase()).is("archived_at", null).maybeSingle();
  return { property, department };
}

async function dictionaries(admin: Admin, viewer: AuthenticatedViewer) {
  const propertyIds = viewer.properties.map((item) => item.id);
  const [{ data: departments }, { data: users }] = await Promise.all([
    admin.from("departments").select("id, name").eq("organization_id", viewer.organizationId).in("property_id", propertyIds.length ? propertyIds : ["00000000-0000-0000-0000-000000000000"]).is("archived_at", null),
    admin.from("users").select("id, display_name").eq("organization_id", viewer.organizationId).is("archived_at", null),
  ]);
  return { departments: new Map((departments ?? []).map((item) => [item.id, item.name])), users: new Map((users ?? []).map((item) => [item.id, item.display_name])) };
}

async function departmentId(admin: Admin, viewer: AuthenticatedViewer, propertyId: string, name?: string) {
  if (!name) return null;
  const { data } = await admin.from("departments").select("id").eq("organization_id", viewer.organizationId).eq("property_id", propertyId).ilike("name", name).is("archived_at", null).maybeSingle();
  return data?.id ?? null;
}

async function userId(admin: Admin, viewer: AuthenticatedViewer, propertyId: string, name?: string) {
  if (!name || name === "Unassigned") return null;
  const { data } = await admin.from("users").select("id").eq("organization_id", viewer.organizationId).eq("home_property_id", propertyId).eq("display_name", name).eq("is_active", true).is("archived_at", null).maybeSingle();
  return data?.id ?? null;
}

async function list(resource: string, viewer: AuthenticatedViewer, admin: Admin) {
  const propertyIds = viewer.properties.map((item) => item.id);
  const scope = propertyIds.length ? propertyIds : ["00000000-0000-0000-0000-000000000000"];
  const names = await dictionaries(admin, viewer);
  if (resource === "departments") {
    const { data, error: queryError } = await admin.from("departments").select("id, name, code").eq("organization_id", viewer.organizationId).in("property_id", scope).is("archived_at", null).order("name");
    if (queryError) throw queryError;
    return (data ?? []).filter((department) => department.code !== "MANAGEMENT").map((department) => ({ id: department.id, workspace: department.code === "FRONT_DESK" ? "front-desk" : department.code === "FOOD_BEVERAGE" ? "food-beverage" : department.code === "HOUSEKEEPING" ? "housekeeping" : department.code === "MAINTENANCE" ? "maintenance" : `department-${department.name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`, name: department.name, titles: [`${department.name} Team Member`, `${department.name} Supervisor`] }));
  }
  if (resource === "employees") {
    const { data, error: queryError } = await admin.from("users").select("id, display_name, job_title, department_id").eq("organization_id", viewer.organizationId).in("home_property_id", scope).eq("is_active", true).is("archived_at", null).order("display_name");
    if (queryError) throw queryError;
    return (data ?? []).map((employee) => ({ id: employee.id, name: employee.display_name, department: names.departments.get(employee.department_id) ?? "Management", title: employee.job_title ?? "Team member", isSupervisor: /supervisor|manager/i.test(employee.job_title ?? "") }));
  }
  if (resource === "service-requests") {
    const { data, error: queryError } = await admin.from("service_requests").select("*").eq("organization_id", viewer.organizationId).in("property_id", scope).is("archived_at", null).order("created_at", { ascending: false });
    if (queryError) throw queryError;
    return (data ?? []).map((row) => ({ id: row.id, title: row.title, description: row.description, location: row.room_or_location ?? "", from: names.departments.get(row.requesting_department_id) ?? "Management", assigned: names.departments.get(row.assigned_department_id) ?? "Unassigned", assignedUser: names.users.get(row.assigned_user_id) ?? "Unassigned", priority: statusLabel(row.priority), status: statusLabel(row.status), due: row.due_at ? new Date(row.due_at).toLocaleString() : "Today", createdAt: Date.parse(row.created_at), createdBy: names.users.get(row.created_by) ?? "Team member" }));
  }
  if (resource === "incidents") {
    const { data, error: queryError } = await admin.from("incidents").select("*").eq("organization_id", viewer.organizationId).in("property_id", scope).is("archived_at", null).order("created_at", { ascending: false });
    if (queryError) throw queryError;
    let visible = data ?? [];
    if (viewer.workspace !== "manager") {
      const departmentCode = viewer.workspace.replace(/^department-/, "CUSTOM_").replace(/-/g, "_").toUpperCase();
      const { data: ownDepartments } = await admin.from("departments").select("id").eq("organization_id", viewer.organizationId).in("property_id", scope).eq("code", departmentCode).is("archived_at", null);
      const ownIds = new Set((ownDepartments ?? []).map((department) => department.id));
      visible = visible.filter((row) => ownIds.has(row.department_id) || (row.involved_department_ids ?? []).some((id: string) => ownIds.has(id)));
    }
    return visible.map((row) => ({ id: row.id, title: `${row.category} · ${row.room_or_location ?? "Property"}`, detail: row.description, status: statusLabel(row.status), tone: row.priority === "URGENT" ? "urgent" : row.priority === "HIGH" ? "warning" : "info", assignedDepartment: names.departments.get(row.involved_department_ids?.[0]) ?? names.departments.get(row.department_id) ?? "Management", createdByDepartment: names.departments.get(row.department_id) ?? "Management", createdBy: names.users.get(row.created_by) ?? "Team member", createdAt: Date.parse(row.created_at), category: row.category, location: row.room_or_location ?? "", severity: statusLabel(row.priority) }));
  }
  if (resource === "work-orders") {
    const { data, error: queryError } = await admin.from("work_orders").select("*").eq("organization_id", viewer.organizationId).in("property_id", scope).is("archived_at", null).order("created_at", { ascending: false });
    if (queryError) throw queryError;
    return (data ?? []).map((row) => ({ id: row.id, title: row.title, description: row.description, location: row.room_or_location ?? "", category: row.category, priority: statusLabel(row.priority), status: statusLabel(row.status), assignee: names.users.get(row.assigned_user_id) ?? "Unassigned", due: row.due_at ? new Date(row.due_at).toLocaleString() : undefined, createdAt: Date.parse(row.created_at), createdBy: names.users.get(row.created_by) ?? "Team member", completionNotes: row.completion_notes ?? undefined, type: row.category === "Preventive" ? "Preventive" : "Corrective" }));
  }
  if (resource === "room-updates") {
    const { data, error: queryError } = await admin.from("room_status_updates").select("*").eq("organization_id", viewer.organizationId).in("property_id", scope).neq("change_type", "HOUSEKEEPING_ASSIGNMENT").is("archived_at", null).order("created_at", { ascending: false });
    if (queryError) throw queryError;
    return (data ?? []).map((row) => ({ id: row.id, room: row.room_number, type: row.change_type, detail: row.operational_note, time: new Date(row.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), state: row.new_status, createdBy: names.users.get(row.created_by) ?? "Team member", expiresAt: row.change_type.toLowerCase().includes("checkout") ? new Date(row.created_at).setHours(18, 0, 0, 0) : undefined }));
  }
  if (resource === "housekeeping-rooms") {
    const { data, error: queryError } = await admin.from("room_status_updates").select("*").eq("organization_id", viewer.organizationId).in("property_id", scope).eq("change_type", "HOUSEKEEPING_ASSIGNMENT").is("archived_at", null).order("room_number");
    if (queryError) throw queryError;
    return (data ?? []).map((row) => { let details: { service?: string; priority?: string; assignedTo?: string } = {}; try { details = JSON.parse(row.operational_note); } catch { /* Legacy rows remain readable with safe defaults. */ } return { id: row.id, room: row.room_number, service: details.service ?? "Departure clean", priority: details.priority ?? "Standard", assignedTo: details.assignedTo ?? "Unassigned", status: row.new_status }; });
  }
  if (resource === "operation-logs") {
    const { data, error: queryError } = await admin.from("operation_logs").select("*").eq("organization_id", viewer.organizationId).in("property_id", scope).is("archived_at", null).order("created_at", { ascending: false });
    if (queryError) throw queryError;
    return (data ?? []).map((row) => ({ id: row.id, author: names.users.get(row.author_id) ?? "Team member", department: names.departments.get(row.department_id) ?? "Management", sharedWith: (row.shared_department_ids ?? []).map((id: string) => names.departments.get(id)).filter(Boolean), time: new Date(row.created_at).toLocaleString(), message: row.content, priority: statusLabel(row.priority), pinned: row.is_pinned, createdAt: Date.parse(row.created_at) }));
  }
  if (resource === "lost-found") {
    const { data, error: queryError } = await admin.from("lost_found_items").select("*").eq("organization_id", viewer.organizationId).in("property_id", scope).is("archived_at", null).order("created_at", { ascending: false });
    if (queryError) throw queryError;
    return (data ?? []).map((row) => ({ id: row.id, title: row.item_description, detail: `Found in ${row.found_location} · Found ${row.found_at} · Stored in ${row.storage_location}`, foundAt: row.found_at.slice(0, 16), foundLocation: row.found_location, storageLocation: row.storage_location, status: statusLabel(row.guest_follow_up_status), tone: row.guest_follow_up_status === "NOT_STARTED" ? "warning" : "info", createdAt: Date.parse(row.created_at), createdBy: names.users.get(row.created_by) ?? "Team member" }));
  }
  if (resource === "notifications") {
    const { data, error: queryError } = await admin.from("notifications").select("*").eq("user_id", viewer.id).is("archived_at", null).order("created_at", { ascending: false });
    if (queryError) throw queryError;
    return (data ?? []).map((row) => ({ id: row.id, department: viewer.workspace === "manager" ? "Management" : viewer.workspace, title: row.title, message: row.body, serviceRequestId: row.entity_id ?? row.id, href: row.entity_type === "operation_log" ? `/app/${viewer.workspace}/operations-log` : undefined, createdAt: Date.parse(row.created_at), createdBy: "StaySync", readAt: row.read_at ? Date.parse(row.read_at) : undefined }));
  }
  let scoreQuery = admin.from("department_scores").select("*").eq("organization_id", viewer.organizationId).in("property_id", scope).is("archived_at", null);
  if (viewer.workspace !== "manager") {
    const { data: ownDepartments, error: departmentError } = await admin.from("departments").select("id").eq("organization_id", viewer.organizationId).in("property_id", scope).eq("code", departmentCodeFromWorkspace(viewer.workspace)).is("archived_at", null);
    if (departmentError) throw departmentError;
    const ownDepartmentIds = (ownDepartments ?? []).map((department) => department.id);
    if (!ownDepartmentIds.length) return [];
    scoreQuery = scoreQuery.in("department_id", ownDepartmentIds);
  }
  const { data, error: queryError } = await scoreQuery.order("review_date", { ascending: false });
  if (queryError) throw queryError;
  const scoreByDepartment = new Map<string, (typeof data)[number]>();
  (data ?? []).forEach((row) => {
    const key = `${row.property_id}:${row.department_id}`;
    if (!scoreByDepartment.has(key)) scoreByDepartment.set(key, row);
  });
  const currentScores = [...scoreByDepartment.values()];
  return currentScores.map((row) => ({ id: row.id, property: viewer.properties.find((item) => item.id === row.property_id)?.name ?? "Property", department: names.departments.get(row.department_id) ?? "Department", score: Number(row.score), previousScore: row.previous_score == null ? undefined : Number(row.previous_score), target: Number(row.target_score ?? 0), reviewDate: row.review_date, reviewType: row.review_type, reviewer: names.users.get(row.created_by) ?? "General Manager", comments: row.comments ?? "", followUp: false, createdAt: Date.parse(row.created_at) }));
}

export async function GET(request: Request) {
  const resource = resourceFrom(request); if (!resource) return error("Unknown operations resource.");
  const viewer = await getAuthenticatedViewer(); if (!viewer) return error("Your session has expired. Please sign in again.", 401);
  if (!authorized(viewer, readPermissions[resource])) return error("You do not have access to this operational data.", 403);
  try { return NextResponse.json({ records: await list(resource, viewer, createAdminClient()) }); }
  catch { return error("Operational data could not be loaded.", 500); }
}

export async function POST(request: Request) {
  const resource = resourceFrom(request); if (!resource) return error("Unknown operations resource.");
  const viewer = await getAuthenticatedViewer(); if (!viewer) return error("Your session has expired. Please sign in again.", 401);
  if (resource === "employees" || resource === "departments") return error("That directory is read-only here.", 405);
  if (resource !== "notifications" && !authorized(viewer, createPermissions[resource])) return error("You do not have permission to create this record.", 403);
  const body = await request.json().catch(() => null); const record = body?.record; if (!record) return error("A record is required.");
  const admin = createAdminClient();
  try {
    const ctx = await context(viewer, admin, record.propertyId ?? record.property);
    if (resource === "notifications") {
      const targetDepartmentId = await departmentId(admin, viewer, ctx.property.id, record.department);
      if (!targetDepartmentId) return error("The notification department was not found.", 404);
      let recipientsQuery = admin.from("users").select("id, display_name, job_title").eq("organization_id", viewer.organizationId).eq("home_property_id", ctx.property.id).eq("department_id", targetDepartmentId).eq("is_active", true).is("archived_at", null);
      if (record.recipientName) recipientsQuery = recipientsQuery.eq("display_name", record.recipientName);
      const { data: candidates, error: recipientsError } = await recipientsQuery;
      if (recipientsError) throw recipientsError;
      const recipients = (candidates ?? []).filter((candidate) => record.audience !== "SUPERVISORS" || /supervisor|manager/i.test(candidate.job_title ?? ""));
      if (!recipients.length) return error("No eligible notification recipients were found.", 404);
      const { error: notificationError } = await admin.from("notifications").insert(recipients.map((recipient) => ({ organization_id: viewer.organizationId, property_id: ctx.property.id, user_id: recipient.id, title: record.title, body: record.message, entity_type: record.kind?.toLowerCase() ?? "operational", entity_id: /^[0-9a-f-]{36}$/i.test(record.serviceRequestId ?? "") ? record.serviceRequestId : null })));
      if (notificationError) throw notificationError;
      return NextResponse.json({ record: { ...record, id: `sent-${Date.now()}`, createdAt: Date.now(), createdBy: viewer.name } }, { status: 201 });
    }
    let table = ""; let values: Record<string, unknown> = {};
    if (resource === "service-requests") { table = "service_requests"; values = { organization_id: viewer.organizationId, property_id: ctx.property.id, requesting_department_id: ctx.department?.id, assigned_department_id: await departmentId(admin, viewer, ctx.property.id, record.assigned), assigned_user_id: await userId(admin, viewer, ctx.property.id, record.assignedUser), title: record.title, description: record.description || record.title, room_or_location: record.location, priority: enumValue(record.priority), status: enumValue(record.status, "OPEN"), created_by: viewer.id }; }
    else if (resource === "incidents") { table = "incidents"; const assigned = await departmentId(admin, viewer, ctx.property.id, record.assignedDepartment); values = { organization_id: viewer.organizationId, property_id: ctx.property.id, department_id: ctx.department?.id, category: record.category || record.title, room_or_location: record.location || "Property", description: record.detail || record.description || record.title, priority: enumValue(record.severity || record.priority), involved_department_ids: assigned ? [assigned] : [], status: enumValue(record.status, "OPEN"), created_by: viewer.id }; }
    else if (resource === "work-orders") { table = "work_orders"; values = { organization_id: viewer.organizationId, property_id: ctx.property.id, department_id: ctx.department?.id, assigned_user_id: await userId(admin, viewer, ctx.property.id, record.assignee), title: record.title, description: record.description || record.title, room_or_location: record.location, category: record.type === "Preventive" ? "Preventive" : record.category || "General", priority: enumValue(record.priority), status: enumValue(record.status, "OPEN"), created_by: viewer.id }; }
    else if (resource === "room-updates") { table = "room_status_updates"; values = { organization_id: viewer.organizationId, property_id: ctx.property.id, department_id: ctx.department?.id, room_number: record.room, change_type: record.type, new_status: record.state, operational_note: record.detail, created_by: viewer.id }; }
    else if (resource === "housekeeping-rooms") { table = "room_status_updates"; values = { organization_id: viewer.organizationId, property_id: ctx.property.id, department_id: ctx.department?.id, room_number: record.room, change_type: "HOUSEKEEPING_ASSIGNMENT", new_status: record.status, operational_note: JSON.stringify({ service: record.service, priority: record.priority, assignedTo: record.assignedTo }), created_by: viewer.id }; }
    else if (resource === "operation-logs") { table = "operation_logs"; const shared = record.sharedWith?.length ? await Promise.all(record.sharedWith.map((name: string) => departmentId(admin, viewer, ctx.property.id, name))) : []; values = { organization_id: viewer.organizationId, property_id: ctx.property.id, department_id: ctx.department?.id, shared_department_ids: shared.filter(Boolean), author_id: viewer.id, content: record.message, priority: enumValue(record.priority), is_pinned: Boolean(record.pinned), created_by: viewer.id }; }
    else if (resource === "department-scores") {
      if (!viewer.permissions.includes("MANAGE_DEPARTMENT_SCORE")) return error("You do not have permission to update scores.", 403);
      const selectedDepartmentId = await departmentId(admin, viewer, ctx.property.id, record.department);
      if (!selectedDepartmentId) return error("The selected department was not found for this property.", 404);
      const scoreValues = { score: record.score, target_score: record.target, review_date: record.reviewDate, review_type: record.reviewType || "Manager review", comments: record.comments || "", created_by: viewer.id };
      const { data: currentScore, error: currentError } = await admin.from("department_scores").select("id, score").eq("organization_id", viewer.organizationId).eq("property_id", ctx.property.id).eq("department_id", selectedDepartmentId).is("archived_at", null).order("review_date", { ascending: false }).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (currentError) throw currentError;
      let savedId: string;
      if (currentScore) {
        let updated = await admin.from("department_scores").update({ ...scoreValues, previous_score: currentScore.score }).eq("id", currentScore.id).eq("organization_id", viewer.organizationId).eq("property_id", ctx.property.id);
        if (isMissingPreviousScore(updated.error)) updated = await admin.from("department_scores").update(scoreValues).eq("id", currentScore.id).eq("organization_id", viewer.organizationId).eq("property_id", ctx.property.id);
        if (updated.error) throw updated.error;
        savedId = currentScore.id;
      } else {
        const insertValues = { ...scoreValues, organization_id: viewer.organizationId, property_id: ctx.property.id, department_id: selectedDepartmentId };
        let inserted = await admin.from("department_scores").insert({ ...insertValues, previous_score: record.previousScore ?? null }).select("id").single();
        if (isMissingPreviousScore(inserted.error)) inserted = await admin.from("department_scores").insert(insertValues).select("id").single();
        if (inserted.error || !inserted.data) throw inserted.error ?? new Error("The department score could not be created.");
        savedId = inserted.data.id;
      }
      const records = await list(resource, viewer, admin);
      const savedRecord = records.find((item: { id: string }) => item.id === savedId) as ({ previousScore?: number } & Record<string, unknown>) | undefined;
      return NextResponse.json({ record: currentScore && savedRecord && savedRecord.previousScore === undefined ? { ...savedRecord, previousScore: Number(currentScore.score) } : savedRecord }, { status: currentScore ? 200 : 201 });
    }
    else if (resource === "lost-found") { table = "lost_found_items"; values = { organization_id: viewer.organizationId, property_id: ctx.property.id, department_id: ctx.department?.id, item_description: record.title, found_location: record.foundLocation, found_at: record.foundAt, found_by: viewer.id, storage_location: record.storageLocation, guest_follow_up_status: enumValue(record.status, "NOT_STARTED"), created_by: viewer.id }; }
    else return error("Notifications are created by operational workflows.", 403);
    const { data, error: insertError } = await admin.from(table).insert(values).select("id").single(); if (insertError || !data) throw insertError;
    const records = await list(resource, viewer, admin); return NextResponse.json({ record: records.find((item: { id: string }) => item.id === data.id) }, { status: 201 });
  } catch { return error("The operational record could not be created.", 500); }
}

export async function PATCH(request: Request) {
  const resource = resourceFrom(request); if (!resource) return error("Unknown operations resource.");
  const viewer = await getAuthenticatedViewer(); if (!viewer) return error("Your session has expired. Please sign in again.", 401);
  const updatePermission = resource === "service-requests" ? "ASSIGN_SERVICE_REQUEST" : resource === "department-scores" ? "MANAGE_DEPARTMENT_SCORE" : createPermissions[resource];
  if (resource !== "notifications" && !authorized(viewer, updatePermission)) return error("You do not have permission to update this record.", 403);
  const body = await request.json().catch(() => null); const record = body?.record; if (!record?.id) return error("A record ID is required.");
  const admin = createAdminClient(); const ctx = await context(viewer, admin, record.propertyId ?? record.property);
  if (resource === "incidents") {
    const { data: incident } = await admin.from("incidents").select("involved_department_ids").eq("id", record.id).eq("organization_id", viewer.organizationId).eq("property_id", ctx.property.id).maybeSingle();
    if (!incident || !ctx.department?.id || !(incident.involved_department_ids ?? []).includes(ctx.department.id)) return error("Only the department assigned to this incident can update it.", 403);
  }
  if (resource === "operation-logs") {
    const { data: log } = await admin.from("operation_logs").select("author_id, created_at").eq("id", record.id).eq("organization_id", viewer.organizationId).eq("property_id", ctx.property.id).maybeSingle();
    if (!log || log.author_id !== viewer.id || Date.now() - Date.parse(log.created_at) > 15 * 60 * 1000) return error("Operation logs can only be edited by their author within 15 minutes.", 403);
  }
  const mapping: Record<string, { table: string; values: Record<string, unknown> }> = {
    "service-requests": { table: "service_requests", values: { title: record.title, description: record.description || record.title, room_or_location: record.location, assigned_department_id: await departmentId(admin, viewer, ctx.property.id, record.assigned), assigned_user_id: await userId(admin, viewer, ctx.property.id, record.assignedUser), priority: enumValue(record.priority), status: enumValue(record.status) } },
    incidents: { table: "incidents", values: { category: record.category || record.title, room_or_location: record.location, description: record.detail, priority: enumValue(record.severity || record.priority), status: enumValue(record.status) } },
    "work-orders": { table: "work_orders", values: { title: record.title, description: record.description || record.title, room_or_location: record.location, assigned_user_id: await userId(admin, viewer, ctx.property.id, record.assignee), category: record.category, priority: enumValue(record.priority), status: enumValue(record.status), completion_notes: record.completionNotes } },
    "room-updates": { table: "room_status_updates", values: { new_status: record.state, operational_note: record.detail } },
    "housekeeping-rooms": { table: "room_status_updates", values: { new_status: record.status, operational_note: JSON.stringify({ service: record.service, priority: record.priority, assignedTo: record.assignedTo }) } },
    "operation-logs": { table: "operation_logs", values: { content: record.message, priority: enumValue(record.priority), is_pinned: Boolean(record.pinned) } },
    notifications: { table: "notifications", values: { read_at: record.readAt ? new Date(record.readAt).toISOString() : new Date().toISOString() } },
    "department-scores": { table: "department_scores", values: { score: record.score, previous_score: record.previousScore, target_score: record.target, review_date: record.reviewDate, review_type: record.reviewType, comments: record.comments } },
    "lost-found": { table: "lost_found_items", values: { item_description: record.title, found_location: record.foundLocation, found_at: record.foundAt, storage_location: record.storageLocation, guest_follow_up_status: enumValue(record.status, "NOT_STARTED") } },
  };
  const target = mapping[resource];
  let query = admin.from(target.table).update(target.values).eq("id", record.id).eq(resource === "notifications" ? "user_id" : "organization_id", resource === "notifications" ? viewer.id : viewer.organizationId);
  if (resource !== "notifications") query.eq("property_id", ctx.property.id);
  let { error: updateError } = await query;
  if (resource === "department-scores" && isMissingPreviousScore(updateError)) {
    const compatibleValues = { ...target.values };
    delete compatibleValues.previous_score;
    query = admin.from(target.table).update(compatibleValues).eq("id", record.id).eq("organization_id", viewer.organizationId).eq("property_id", ctx.property.id);
    ({ error: updateError } = await query);
  }
  if (updateError) return error("The operational record could not be updated.", 500);
  const records = await list(resource, viewer, admin);
  const savedRecord = records.find((item: { id: string }) => item.id === record.id) ?? record;
  return NextResponse.json({ record: resource === "department-scores" && savedRecord.previousScore === undefined ? { ...savedRecord, previousScore: record.previousScore } : savedRecord });
}

export async function DELETE(request: Request) {
  const resource = resourceFrom(request); if (!resource || resource === "notifications") return error("That resource cannot be deleted.");
  const viewer = await getAuthenticatedViewer(); if (!viewer) return error("Your session has expired. Please sign in again.", 401);
  const body = await request.json().catch(() => null); if (!body?.id) return error("A record ID is required.");
  const tables: Record<string, string> = { "service-requests": "service_requests", incidents: "incidents", "work-orders": "work_orders", "room-updates": "room_status_updates", "housekeeping-rooms": "room_status_updates", "operation-logs": "operation_logs", "department-scores": "department_scores", "lost-found": "lost_found_items" };
  const { error: deleteError } = await createAdminClient().from(tables[resource]).update({ archived_at: new Date().toISOString() }).eq("id", body.id).eq("organization_id", viewer.organizationId);
  if (deleteError) return error("The operational record could not be removed.", 500);
  return NextResponse.json({ deleted: true });
}
