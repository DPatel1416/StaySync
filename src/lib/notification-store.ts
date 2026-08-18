"use client";

export type DepartmentNotification = {
  id: string;
  department: string;
  title: string;
  message: string;
  serviceRequestId: string;
  createdAt: number;
  createdBy: string;
};

let notifications: DepartmentNotification[] = [];

export function sendDepartmentReminder(notification: Omit<DepartmentNotification, "id" | "createdAt">) {
  const created: DepartmentNotification = {
    ...notification,
    id: `notification-${Date.now()}-${notifications.length + 1}`,
    createdAt: Date.now(),
  };
  notifications = [created, ...notifications];
  return created;
}

export function getDepartmentNotifications() {
  return notifications;
}
