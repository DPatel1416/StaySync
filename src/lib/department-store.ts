"use client";

import { useSyncExternalStore } from "react";
import type { WorkspaceRole } from "./permissions";
import { publishBrowserState, subscribeBrowserState } from "./browser-live-sync";

export type DepartmentDefinition = {
  workspace: WorkspaceRole;
  name: string;
  titles: string[];
  builtIn?: boolean;
};

const seedDepartments: DepartmentDefinition[] = [
  { workspace: "front-desk", name: "Front Desk", titles: ["Front Desk Agent", "Front Desk Supervisor"], builtIn: true },
  { workspace: "housekeeping", name: "Housekeeping", titles: ["Housekeeping Attendant", "Housekeeping Supervisor"], builtIn: true },
  { workspace: "maintenance", name: "Maintenance", titles: ["Maintenance Technician", "Maintenance Supervisor"], builtIn: true },
  { workspace: "food-beverage", name: "Food & Beverage", titles: ["Food & Beverage Team Member", "Food & Beverage Supervisor"], builtIn: true },
];

const storageKey = "staysync-departments";
let departments = [...seedDepartments];
let hydrated = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) departments = JSON.parse(stored) as DepartmentDefinition[];
  } catch { departments = [...seedDepartments]; }
  subscribeBrowserState(storageKey, (value) => {
    try { departments = value ? JSON.parse(value) as DepartmentDefinition[] : [...seedDepartments]; }
    catch { departments = [...seedDepartments]; }
    notify();
  });
}

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getDepartments() { hydrate(); return departments; }

export function addDepartment(name: string) {
  hydrate();
  const cleanName = name.trim().replace(/\s+/g, " ");
  if (!cleanName) throw new Error("Enter a department name.");
  const duplicate = departments.find((item) => item.name.toLowerCase() === cleanName.toLowerCase());
  if (duplicate) return duplicate;
  const slug = slugify(cleanName);
  if (!slug) throw new Error("Enter a valid department name.");
  const department: DepartmentDefinition = {
    workspace: `department-${slug}`,
    name: cleanName,
    titles: [`${cleanName} Team Member`, `${cleanName} Supervisor`],
  };
  departments = [...departments, department];
  publishBrowserState(storageKey, JSON.stringify(departments));
  notify();
  return department;
}

export function getDepartmentLabel(workspace: WorkspaceRole, source = getDepartments()) {
  if (workspace === "manager") return "Management";
  return source.find((item) => item.workspace === workspace)?.name ?? workspace.replace(/^department-/, "").split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

export function getDepartmentTitles(workspace: WorkspaceRole, source = getDepartments()) {
  if (workspace === "manager") return ["General Manager"];
  return source.find((item) => item.workspace === workspace)?.titles ?? [`${getDepartmentLabel(workspace, source)} Team Member`, `${getDepartmentLabel(workspace, source)} Supervisor`];
}

export function useDepartments() {
  return useSyncExternalStore<DepartmentDefinition[]>(
    (listener) => { hydrate(); listeners.add(listener); return () => listeners.delete(listener); },
    () => { hydrate(); return departments; },
    () => seedDepartments,
  );
}
