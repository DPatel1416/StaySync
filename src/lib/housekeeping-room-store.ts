"use client";

import { sendDepartmentReminder } from "./notification-store";
import { createOperationsStore } from "./operations-store";

export type HousekeepingRoomStatus = "Assigned" | "In Progress" | "Ready to inspect" | "Inspected" | "Waiting" | "Ready to assign";

export type HousekeepingRoomAssignment = {
  id?: string;
  room: string;
  service: "Departure clean" | "Stayover service" | "Refresh service";
  priority: "Standard" | "Priority";
  assignedTo: string;
  status: HousekeepingRoomStatus;
};

type StoredAssignment = HousekeepingRoomAssignment & { id: string };
const store = createOperationsStore<StoredAssignment>("housekeeping-rooms");

export function updateHousekeepingRoom(room: string, changes: Partial<Pick<HousekeepingRoomAssignment, "assignedTo" | "status">>) {
  const previous = store.get().find((assignment) => assignment.room === room);
  if (!previous) return;
  store.update({ ...previous, ...changes });
  if (changes.status === "Ready to inspect" && previous?.status !== "Ready to inspect") {
    sendDepartmentReminder({ department: "Housekeeping", title: `Room ${room} ready for inspection`, message: `${previous?.assignedTo ?? "The assigned attendant"} marked room ${room} ready for supervisor inspection.`, serviceRequestId: `room-${room}`, href: "/app/housekeeping/assigned-rooms", createdBy: previous?.assignedTo ?? "Housekeeping attendant", audience: "SUPERVISORS", tone: "warning", kind: "INSPECTION" });
  }
}

export function parseRoomNumbers(value: string) {
  const rooms = new Set<string>();
  for (const token of value.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean)) {
    const range = token.match(/^(\d+)-(\d+)$/);
    if (!range) { rooms.add(token); continue; }
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (end < start || end - start > 500) continue;
    for (let room = start; room <= end; room += 1) rooms.add(String(room));
  }
  return [...rooms];
}

export function assignHousekeepingRooms(roomNumbers: string[], assignedTo: string, service: HousekeepingRoomAssignment["service"], priority: HousekeepingRoomAssignment["priority"]) {
  for (const room of roomNumbers) {
    const existing = store.get().find((assignment) => assignment.room === room);
    const next: StoredAssignment = { id: existing?.id ?? `pending-${Date.now()}-${room}`, room, service, priority, assignedTo, status: "Assigned" };
    if (existing) store.update(next); else store.add(next);
  }
}

export function releaseRoomToHousekeeping(room: string) {
  const existing = store.get().find((assignment) => assignment.room === room);
  const released: StoredAssignment = existing
    ? { ...existing, assignedTo: "Unassigned", status: "Ready to assign" }
    : { id: `pending-${Date.now()}-${room}`, room, service: "Departure clean", priority: "Standard", assignedTo: "Unassigned", status: "Ready to assign" };
  if (existing) store.update(released); else store.add(released);
}

export function useHousekeepingRooms() {
  return store.useRecords();
}

export const housekeepingEmployees = ["Unassigned"];
