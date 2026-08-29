"use client";

import { createOperationsStore } from "./operations-store";

export type IncidentRecord = {
  id: string;
  title: string;
  detail: string;
  status: string;
  tone: "neutral" | "info" | "success" | "warning" | "urgent";
  assignedDepartment: string;
  createdByDepartment: string;
  createdBy?: string;
  createdAt?: number;
  category?: string;
  property?: string;
  location?: string;
  severity?: string;
  owner?: string;
  reportable?: boolean;
};

const store = createOperationsStore<IncidentRecord>("incidents");
export function addIncident(record: IncidentRecord) { store.add(record); }
export function updateIncident(record: IncidentRecord) { store.update(record); }
export function deleteIncident(id: string) { store.remove(id); }
export function useIncidents() { return store.useRecords(); }
