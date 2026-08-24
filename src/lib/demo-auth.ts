import type { WorkspaceRole } from "./permissions";

export type DemoEmployee = { password: string; workspace: WorkspaceRole; name: string; title: string; isSupervisor?: boolean };

export const demoEmployees: Record<string, DemoEmployee> = {
  "alex.morgan": { password: "staysync-demo", workspace: "front-desk", name: "Alex Morgan", title: "Guest Services Agent" },
  "sofia.martin": { password: "staysync-demo", workspace: "housekeeping", name: "Sofia Martin", title: "Housekeeping Supervisor", isSupervisor: true },
  "priya.shah": { password: "staysync-demo", workspace: "housekeeping", name: "Priya Shah", title: "Room Attendant" },
  "elena.ruiz": { password: "staysync-demo", workspace: "housekeeping", name: "Elena Ruiz", title: "Room Attendant" },
  "sam.rivera": { password: "staysync-demo", workspace: "maintenance", name: "Sam Rivera", title: "Maintenance Supervisor", isSupervisor: true },
  "jordan.lee": { password: "staysync-demo", workspace: "maintenance", name: "Jordan Lee", title: "Maintenance Technician" },
  "noah.wilson": { password: "staysync-demo", workspace: "maintenance", name: "Noah Wilson", title: "Maintenance Technician" },
  "maya.chen": { password: "staysync-demo", workspace: "manager", name: "Maya Chen", title: "Operations Manager", isSupervisor: true },
};

const sessionKey = "staysync-demo-employee";

export function authenticateDemoEmployee(username: string, password: string) {
  const employee = demoEmployees[username.trim().toLowerCase()];
  return employee?.password === password ? employee : null;
}

export function saveDemoEmployeeSession(username: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(sessionKey, username.trim().toLowerCase());
}

export function clearDemoEmployeeSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(sessionKey);
}

export function getDemoEmployeeSession(workspace: WorkspaceRole) {
  if (typeof window === "undefined") return null;
  const username = window.localStorage.getItem(sessionKey) ?? "";
  const employee = demoEmployees[username];
  return employee?.workspace === workspace ? employee : null;
}
