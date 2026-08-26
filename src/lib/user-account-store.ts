"use client";

import { useSyncExternalStore } from "react";
import type { WorkspaceRole } from "./permissions";
import { publishBrowserState, subscribeBrowserState } from "./browser-live-sync";

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
  status: "Active" | "Temporary password";
  primaryAccount?: boolean;
};

export const departmentTitles: Record<WorkspaceRole, string[]> = {
  manager: ["General Manager"],
  "front-desk": ["Front Desk Agent", "Front Desk Supervisor"],
  housekeeping: ["Housekeeping Attendant", "Housekeeping Supervisor"],
  maintenance: ["Maintenance Technician", "Maintenance Supervisor"],
};

export const departmentLabels: Record<WorkspaceRole, string> = {
  manager: "Management",
  "front-desk": "Front Desk",
  housekeeping: "Housekeeping",
  maintenance: "Maintenance",
};

const seedAccounts: UserAccount[] = [
  { id: "user-maya", name: "Maya Chen", username: "maya.chen", email: "maya.chen@northstar.example", password: "staysync-demo", workspace: "manager", title: "General Manager", isSupervisor: true, property: "Ottawa Downtown", status: "Active", primaryAccount: true },
  { id: "user-alex", name: "Alex Morgan", username: "alex.morgan", password: "staysync-demo", workspace: "front-desk", title: "Front Desk Agent", isSupervisor: false, property: "Ottawa Downtown", status: "Active" },
  { id: "user-sofia", name: "Sofia Martin", username: "sofia.martin", password: "staysync-demo", workspace: "housekeeping", title: "Housekeeping Supervisor", isSupervisor: true, property: "Ottawa Downtown", status: "Active" },
  { id: "user-priya", name: "Priya Shah", username: "priya.shah", password: "staysync-demo", workspace: "housekeeping", title: "Housekeeping Attendant", isSupervisor: false, property: "Ottawa Downtown", status: "Temporary password" },
  { id: "user-elena", name: "Elena Ruiz", username: "elena.ruiz", password: "staysync-demo", workspace: "housekeeping", title: "Housekeeping Attendant", isSupervisor: false, property: "Ottawa Downtown", status: "Active" },
  { id: "user-sam", name: "Sam Rivera", username: "sam.rivera", password: "staysync-demo", workspace: "maintenance", title: "Maintenance Supervisor", isSupervisor: true, property: "Ottawa Downtown", status: "Active" },
  { id: "user-jordan", name: "Jordan Lee", username: "jordan.lee", password: "staysync-demo", workspace: "maintenance", title: "Maintenance Technician", isSupervisor: false, property: "Ottawa Downtown", status: "Active" },
  { id: "user-noah", name: "Noah Wilson", username: "noah.wilson", password: "staysync-demo", workspace: "maintenance", title: "Maintenance Technician", isSupervisor: false, property: "Ottawa Downtown", status: "Active" },
];

const storageKey = "staysync-user-accounts";
let accounts = [...seedAccounts];
let hydrated = false;
const listeners = new Set<() => void>();

function notify() { listeners.forEach((listener) => listener()); }

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) accounts = JSON.parse(stored) as UserAccount[];
  } catch { accounts = [...seedAccounts]; }
  subscribeBrowserState(storageKey, (value) => {
    try { accounts = value ? JSON.parse(value) as UserAccount[] : [...seedAccounts]; }
    catch { accounts = [...seedAccounts]; }
    notify();
  });
}

function persist() {
  publishBrowserState(storageKey, JSON.stringify(accounts));
}

export function getUserAccounts() {
  hydrate();
  return accounts;
}

export function getUserAccountByUsername(username: string) {
  return getUserAccounts().find((account) => account.username === username.trim().toLowerCase()) ?? null;
}

export function addUserAccount(account: UserAccount) {
  hydrate();
  accounts = [account, ...accounts];
  persist();
  notify();
}

export function updateUserAccount(updated: UserAccount) {
  hydrate();
  accounts = accounts.map((account) => account.id === updated.id ? updated : account);
  persist();
  notify();
}

export function deleteUserAccount(id: string) {
  hydrate();
  const target = accounts.find((account) => account.id === id);
  if (!target || target.primaryAccount) return false;
  accounts = accounts.filter((account) => account.id !== id);
  persist();
  notify();
  return true;
}

export function useUserAccounts() {
  return useSyncExternalStore<UserAccount[]>(
    (listener) => { hydrate(); listeners.add(listener); return () => listeners.delete(listener); },
    () => { hydrate(); return accounts; },
    () => seedAccounts,
  );
}
