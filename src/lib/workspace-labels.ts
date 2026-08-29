import type { WorkspaceRole } from "./permissions";

export const workspaceNames: Record<WorkspaceRole, string> = new Proxy({
  "front-desk": "Front Desk",
  housekeeping: "Housekeeping",
  maintenance: "Maintenance",
  "food-beverage": "Food & Beverage",
  manager: "Management",
} as Record<WorkspaceRole, string>, {
  get(target, property: string) {
    return target[property as WorkspaceRole] ?? property.replace(/^department-/, "").split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
  },
});
