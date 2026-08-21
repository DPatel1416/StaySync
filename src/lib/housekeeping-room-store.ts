"use client";

import { useSyncExternalStore } from "react";

export type HousekeepingRoomStatus = "Assigned" | "In Progress" | "Ready to inspect" | "Inspected" | "Waiting";

export type HousekeepingRoomAssignment = {
  room: string;
  service: "Departure clean" | "Stayover service" | "Refresh service";
  priority: "Standard" | "Priority";
  assignedTo: string;
  status: HousekeepingRoomStatus;
};

const seedAssignments: HousekeepingRoomAssignment[] = [
  { room: "307", service: "Stayover service", priority: "Priority", assignedTo: "Priya Shah", status: "Assigned" },
  { room: "308", service: "Departure clean", priority: "Standard", assignedTo: "Priya Shah", status: "In Progress" },
  { room: "412", service: "Departure clean", priority: "Standard", assignedTo: "Unassigned", status: "Waiting" },
  { room: "518", service: "Departure clean", priority: "Priority", assignedTo: "Elena Ruiz", status: "In Progress" },
  { room: "621", service: "Refresh service", priority: "Standard", assignedTo: "Marcus Green", status: "Ready to inspect" },
];

let assignments = [...seedAssignments];
const listeners = new Set<() => void>();
const storageKey = "staysync-housekeeping-room-board";
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) assignments = (JSON.parse(stored) as Array<Omit<HousekeepingRoomAssignment, "status"> & { status: HousekeepingRoomStatus | "Ready" }>).map((assignment) => ({ ...assignment, status: assignment.status === "Ready" ? "Ready to inspect" : assignment.status }));
  } catch {
    assignments = [...seedAssignments];
  }
}

function persist() {
  if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(assignments));
}

function notify() { listeners.forEach((listener) => listener()); }

export function updateHousekeepingRoom(room: string, changes: Partial<Pick<HousekeepingRoomAssignment, "assignedTo" | "status">>) {
  hydrate();
  assignments = assignments.map((assignment) => assignment.room === room ? { ...assignment, ...changes } : assignment);
  persist();
  notify();
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
  hydrate();
  for (const room of roomNumbers) {
    const existing = assignments.find((assignment) => assignment.room === room);
    const next: HousekeepingRoomAssignment = { room, service, priority, assignedTo, status: "Assigned" };
    assignments = existing ? assignments.map((assignment) => assignment.room === room ? next : assignment) : [...assignments, next];
  }
  assignments.sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true }));
  persist();
  notify();
}

export function useHousekeepingRooms() {
  return useSyncExternalStore(
    (listener) => { hydrate(); listeners.add(listener); return () => listeners.delete(listener); },
    () => { hydrate(); return assignments; },
    () => seedAssignments,
  );
}

export const housekeepingEmployees = ["Unassigned", "Priya Shah", "Elena Ruiz", "Marcus Green"];
