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
};

const seed: WorkOrder[] = seedWorkOrders.map((order) => ({
  ...order,
  category: order.title.includes("AC") ? "HVAC" : order.title.includes("fixture") ? "Plumbing" : "Equipment",
  requiresHousekeepingClearance: order.location.startsWith("Room "),
})) as WorkOrder[];
let workOrders: WorkOrder[] = [...seed];
const listeners = new Set<() => void>();
const storageKey = "staysync-work-orders";
let hydrated = false;

function notify() { listeners.forEach((listener) => listener()); }
function persist() { publishBrowserState(storageKey, JSON.stringify(workOrders)); }

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) workOrders = JSON.parse(stored) as WorkOrder[];
  } catch { workOrders = [...seed]; }
  subscribeBrowserState(storageKey, (value) => {
    try { workOrders = value ? JSON.parse(value) as WorkOrder[] : [...seed]; } catch { workOrders = [...seed]; }
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
