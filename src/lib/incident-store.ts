"use client";

import { useSyncExternalStore } from "react";
import { publishBrowserState, subscribeBrowserState } from "./browser-live-sync";

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

const seedIncidents: IncidentRecord[] = [
  { id: "INC-210", title: "INC-210 · Guest follow-up", detail: "Room 412 · Assigned to Front Desk", status: "Open", tone: "info", assignedDepartment: "Front Desk", createdByDepartment: "Front Desk" },
  { id: "INC-209", title: "INC-209 · Guest relocation after AC issue", detail: "Room 604 · Assigned to Management", status: "Awaiting review", tone: "warning", assignedDepartment: "Management", createdByDepartment: "Front Desk" },
  { id: "INC-208", title: "INC-208 · Slip near pool entrance", detail: "Pool corridor · Assigned to Maintenance", status: "In Progress", tone: "warning", assignedDepartment: "Maintenance", createdByDepartment: "Housekeeping" },
];

const storageKey = "staysync-incidents";
let incidents = [...seedIncidents];
let hydrated = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try { const stored = window.localStorage.getItem(storageKey); if (stored) incidents = JSON.parse(stored) as IncidentRecord[]; }
  catch { incidents = [...seedIncidents]; }
  subscribeBrowserState(storageKey, (value) => { try { incidents = value ? JSON.parse(value) as IncidentRecord[] : [...seedIncidents]; } catch { incidents = [...seedIncidents]; } notify(); });
}
function persist() { publishBrowserState(storageKey, JSON.stringify(incidents)); notify(); }
export function addIncident(record: IncidentRecord) { hydrate(); incidents = [record, ...incidents]; persist(); }
export function updateIncident(record: IncidentRecord) { hydrate(); incidents = incidents.map((item) => item.id === record.id ? record : item); persist(); }
export function deleteIncident(id: string) { hydrate(); incidents = incidents.filter((item) => item.id !== id); persist(); }
export function useIncidents() { return useSyncExternalStore<IncidentRecord[]>((listener) => { hydrate(); listeners.add(listener); return () => listeners.delete(listener); }, () => { hydrate(); return incidents; }, () => seedIncidents); }
