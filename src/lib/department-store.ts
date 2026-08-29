"use client";

import { useSyncExternalStore } from "react";
import type { WorkspaceRole } from "./permissions";

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

let departments = [...seedDepartments];
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function loadDepartments() {
  if (loaded || loading || typeof window === "undefined") return;
  loading = fetch("/api/operations?resource=departments", { cache: "no-store" }).then(async (response) => {
    if (!response.ok) return;
    const result = await response.json() as { records?: DepartmentDefinition[] };
    if (result.records) {
      const unique = new Map<WorkspaceRole, DepartmentDefinition>();
      result.records.forEach((department) => {
        if (!unique.has(department.workspace)) unique.set(department.workspace, department);
      });
      departments = [...unique.values()];
    }
  }).catch(() => undefined).finally(() => { loaded = true; loading = null; notify(); });
}

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getDepartments() { loadDepartments(); return departments; }

export function addDepartment(name: string) {
  const cleanName = name.trim().replace(/\s+/g, " ");
  if (!cleanName) throw new Error("Enter a department name.");
  if (cleanName.toLowerCase() === "management") {
    return { workspace: "manager" as const, name: "Management", titles: ["General Manager", "Assistant General Manager"], builtIn: true };
  }
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
  notify();
  return department;
}

export function removeDepartment(workspace: WorkspaceRole) {
  const next = departments.filter((department) => department.builtIn || department.workspace !== workspace);
  if (next.length === departments.length) return;
  departments = next;
  notify();
}

export function getDepartmentLabel(workspace: WorkspaceRole, source = getDepartments()) {
  if (workspace === "manager") return "Management";
  return source.find((item) => item.workspace === workspace)?.name ?? workspace.replace(/^department-/, "").split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

export function getDepartmentTitles(workspace: WorkspaceRole, source = getDepartments()) {
  if (workspace === "manager") return ["General Manager", "Assistant General Manager"];
  return source.find((item) => item.workspace === workspace)?.titles ?? [`${getDepartmentLabel(workspace, source)} Team Member`, `${getDepartmentLabel(workspace, source)} Supervisor`];
}

export function useDepartments() {
  return useSyncExternalStore<DepartmentDefinition[]>(
    (listener) => { loadDepartments(); listeners.add(listener); return () => listeners.delete(listener); },
    () => { loadDepartments(); return departments; },
    () => seedDepartments,
  );
}
