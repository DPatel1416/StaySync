"use client";

import { useSyncExternalStore } from "react";

export type HousekeepingRoomStatus = "Assigned" | "In Progress" | "Ready" | "Waiting";

export type HousekeepingRoomAssignment = {
  room: string;
  service: "Departure clean" | "Stayover service" | "Refresh service";
  priority: "Standard" | "Priority";
  assignedTo: string;
  status: HousekeepingRoomStatus;
};

const seedAssignments: HousekeepingRoomAssignment[] = [
  { room: "307", service: "Stayover service", priority: "Priority", assignedTo: "Priya Shah", status: "Assigned" },
  { room: "412", service: "Departure clean", priority: "Standard", assignedTo: "Unassigned", status: "Waiting" },
  { room: "518", service: "Departure clean", priority: "Priority", assignedTo: "Elena Ruiz", status: "In Progress" },
  { room: "621", service: "Refresh service", priority: "Standard", assignedTo: "Marcus Green", status: "Ready" },
];

let assignments = [...seedAssignments];
const listeners = new Set<() => void>();

function notify() { listeners.forEach((listener) => listener()); }

export function updateHousekeepingRoom(room: string, changes: Partial<Pick<HousekeepingRoomAssignment, "assignedTo" | "status">>) {
  assignments = assignments.map((assignment) => assignment.room === room ? { ...assignment, ...changes } : assignment);
  notify();
}

export function useHousekeepingRooms() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => assignments,
    () => seedAssignments,
  );
}

export const housekeepingEmployees = ["Unassigned", "Priya Shah", "Elena Ruiz", "Marcus Green"];
