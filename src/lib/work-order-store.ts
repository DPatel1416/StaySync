"use client";

import { createOperationsStore } from "./operations-store";

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

const store = createOperationsStore<WorkOrder>("work-orders");

export function addWorkOrder(workOrder: WorkOrder) {
  store.add(workOrder);
}

export function updateWorkOrder(updated: WorkOrder) {
  store.update(updated);
}

export function useWorkOrders() {
  return store.useRecords();
}

export const maintenanceEmployees = ["Unassigned"];
