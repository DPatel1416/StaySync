import type { WorkspaceRole } from "./permissions";

export const demoEmployees: Record<string, { password: string; workspace: WorkspaceRole; name: string }> = {
  "alex.morgan": { password: "staysync-demo", workspace: "front-desk", name: "Alex Morgan" },
  "priya.shah": { password: "staysync-demo", workspace: "housekeeping", name: "Priya Shah" },
  "jordan.lee": { password: "staysync-demo", workspace: "maintenance", name: "Jordan Lee" },
  "maya.chen": { password: "staysync-demo", workspace: "manager", name: "Maya Chen" },
};

export function authenticateDemoEmployee(username: string, password: string) {
  const employee = demoEmployees[username.trim().toLowerCase()];
  return employee?.password === password ? employee : null;
}
