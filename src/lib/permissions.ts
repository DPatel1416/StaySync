export const permissions = [
  "CREATE_SERVICE_REQUEST", "VIEW_SERVICE_REQUEST", "ASSIGN_SERVICE_REQUEST",
  "CREATE_INCIDENT", "VIEW_INCIDENT", "UPDATE_ROOM_STATUS", "CREATE_OPERATION_LOG",
  "VIEW_PAYMENT_ISSUE", "MANAGE_DEPARTMENT_SCORE", "VIEW_REPORTS", "MANAGE_USERS",
  "MANAGE_PROPERTIES", "CREATE_WORK_ORDER", "VIEW_WORK_ORDER",
] as const;

export type Permission = (typeof permissions)[number];
export type WorkspaceRole = "front-desk" | "housekeeping" | "maintenance" | "manager";

export const rolePermissions: Record<WorkspaceRole, Permission[]> = {
  "front-desk": ["CREATE_SERVICE_REQUEST", "VIEW_SERVICE_REQUEST", "CREATE_INCIDENT", "VIEW_INCIDENT", "UPDATE_ROOM_STATUS", "CREATE_OPERATION_LOG", "VIEW_PAYMENT_ISSUE"],
  housekeeping: ["CREATE_SERVICE_REQUEST", "VIEW_SERVICE_REQUEST", "UPDATE_ROOM_STATUS", "CREATE_OPERATION_LOG"],
  maintenance: ["VIEW_SERVICE_REQUEST", "ASSIGN_SERVICE_REQUEST", "CREATE_OPERATION_LOG", "CREATE_WORK_ORDER", "VIEW_WORK_ORDER"],
  manager: [...permissions],
};

export function can(role: WorkspaceRole, permission: Permission) {
  return rolePermissions[role].includes(permission);
}
