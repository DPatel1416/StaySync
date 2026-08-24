"use client";

import { useSyncExternalStore } from "react";
import { workOrders as seedWorkOrders } from "./demo-data";
import { publishBrowserState, subscribeBrowserState } from "./browser-live-sync";

export type WorkOrderStatus = "Open" | "Assigned" | "In Progress" | "Waiting" | "Completed" | "Cancelled";

export type WorkOrder = {
  id: string;
  title: string;
  description?: string;
  location: string;
  category: string;
  priority: string;
  status: WorkOrderStatus;
  assignee: string;
  due?: string;
  age?: string;
  requiresHousekeepingClearance?: boolean;
  completionNotes?: string;
  createdAt?: number;
  createdBy?: string;
  type?: "Corrective" | "Preventive";
  frequency?: string;
};

const seed: WorkOrder[] = seedWorkOrders.map((order) => ({
  ...order,
  category: order.title.includes("AC") ? "HVAC" : order.title.includes("fixture") ? "Plumbing" : "Equipment",
  requiresHousekeepingClearance: order.location.startsWith("Room "),
  type: order.id === "WO-279" ? "Preventive" : "Corrective",
})) as WorkOrder[];
let workOrders: WorkOrder[] = [...seed];
const listeners = new Set<() => void>();
const storageKey = "staysync-work-orders";
let hydrated = false;

function notify() { listeners.forEach((listener) => listener()); }
function persist() { publishBrowserState(storageKey, JSON.stringify(workOrders)); }
function normalizeWorkOrders(value: WorkOrder[]) { return value.map((order) => ({ ...order, category: order.category ?? (order.title.includes("AC") ? "HVAC" : "Equipment"), type: order.type ?? (order.id === "WO-279" ? "Preventive" : "Corrective"), assignee: order.id === "WO-283" && order.assignee === "Sam Rivera" ? "Noah Wilson" : order.assignee })); }

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      const storedOrders = JSON.parse(stored) as WorkOrder[];
      workOrders = normalizeWorkOrders(storedOrders);
      if (JSON.stringify(workOrders) !== JSON.stringify(storedOrders)) persist();
    }
  } catch { workOrders = [...seed]; }
  subscribeBrowserState(storageKey, (value) => {
    try { workOrders = value ? normalizeWorkOrders(JSON.parse(value) as WorkOrder[]) : [...seed]; } catch { workOrders = [...seed]; }
    notify();
  });
}

export function addWorkOrder(workOrder: WorkOrder) {
  hydrate();
  workOrders = [workOrder, ...workOrders];
  persist();
  notify();
}

export function updateWorkOrder(updated: WorkOrder) {
  hydrate();
  workOrders = workOrders.map((workOrder) => workOrder.id === updated.id ? updated : workOrder);
  persist();
  notify();
}

export function useWorkOrders() {
  return useSyncExternalStore(
    (listener) => { hydrate(); listeners.add(listener); return () => listeners.delete(listener); },
    () => { hydrate(); return workOrders; },
    () => seed,
  );
}

export const maintenanceEmployees = ["Unassigned", "Jordan Lee", "Noah Wilson", "Sam Rivera"];
