"use client";

export type OperationsResource = "service-requests" | "incidents" | "work-orders" | "room-updates" | "housekeeping-rooms" | "operation-logs" | "notifications" | "department-scores" | "employees" | "lost-found" | "departments";

async function request<T>(resource: OperationsResource, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/operations?resource=${encodeURIComponent(resource)}`, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "Operational data could not be saved.");
  return result as T;
}

export async function loadOperationalRecords<T>(resource: OperationsResource) {
  return (await request<{ records: T[] }>(resource)).records;
}

export async function createOperationalRecord<T>(resource: OperationsResource, record: T) {
  return (await request<{ record: T }>(resource, { method: "POST", body: JSON.stringify({ record }) })).record;
}

export async function updateOperationalRecord<T extends { id: string }>(resource: OperationsResource, record: T) {
  return (await request<{ record: T }>(resource, { method: "PATCH", body: JSON.stringify({ record }) })).record;
}

export async function deleteOperationalRecord(resource: OperationsResource, id: string) {
  await request(resource, { method: "DELETE", body: JSON.stringify({ id }) });
}
