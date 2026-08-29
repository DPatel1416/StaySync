"use client";

import type { WorkspaceRole } from "./permissions";

export type UserAccount = {
  id: string;
  name: string;
  username: string;
  email?: string;
  password: string;
  workspace: WorkspaceRole;
  title: string;
  isSupervisor: boolean;
  property: string;
  propertyId?: string;
  status: "Active";
  primaryAccount?: boolean;
};

export const departmentTitles: Record<WorkspaceRole, string[]> = new Proxy({
  manager: ["General Manager", "Assistant General Manager"],
  "front-desk": ["Front Desk Agent", "Front Desk Supervisor"],
  housekeeping: ["Housekeeping Attendant", "Housekeeping Supervisor"],
  maintenance: ["Maintenance Technician", "Maintenance Supervisor"],
  "food-beverage": ["Food & Beverage Team Member"],
} as Record<WorkspaceRole, string[]>, { get(target, property: string) { return target[property as WorkspaceRole] ?? [`${property.replace(/^department-/, "").split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ")} Team Member`, `${property.replace(/^department-/, "").split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ")} Supervisor`]; } });

export const departmentLabels: Record<WorkspaceRole, string> = new Proxy({
  manager: "Management",
  "front-desk": "Front Desk",
  housekeeping: "Housekeeping",
  maintenance: "Maintenance",
  "food-beverage": "Food & Beverage",
} as Record<WorkspaceRole, string>, { get(target, property: string) { return target[property as WorkspaceRole] ?? property.replace(/^department-/, "").split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" "); } });

// Kept only so legacy component tests can construct empty account collections.
// Runtime account data is always loaded from the authenticated management API.
export function getUserAccounts(): UserAccount[] { return []; }
export function updateUserAccount(_account: UserAccount): void {}
