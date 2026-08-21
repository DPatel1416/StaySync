"use client";

import { useSyncExternalStore } from "react";

export type DepartmentNotification = {
  id: string;
  department: string;
  title: string;
  message: string;
  serviceRequestId: string;
  createdAt: number;
  createdBy: string;
  readAt?: number;
  audience?: "DEPARTMENT" | "SUPERVISORS";
};

let notifications: DepartmentNotification[] = [];
const listeners = new Set<() => void>();
const storageKey = "staysync-department-notifications";
let hydrated = false;
let listeningForStorage = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) notifications = JSON.parse(stored) as DepartmentNotification[];
  } catch {
    notifications = [];
  }
  if (!listeningForStorage) {
    listeningForStorage = true;
    window.addEventListener("storage", (event) => {
      if (event.key !== storageKey) return;
      try { notifications = event.newValue ? JSON.parse(event.newValue) as DepartmentNotification[] : []; } catch { notifications = []; }
      notify();
    });
  }
}

function persist() {
  if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(notifications));
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function sendDepartmentReminder(notification: Omit<DepartmentNotification, "id" | "createdAt">) {
  hydrate();
  const created: DepartmentNotification = {
    ...notification,
    id: `notification-${Date.now()}-${notifications.length + 1}`,
    createdAt: Date.now(),
  };
  notifications = [created, ...notifications];
  persist();
  notify();
  return created;
}

export function getDepartmentNotifications() {
  hydrate();
  return notifications;
}

export function markDepartmentNotificationsRead(department: string, isSupervisor = true) {
  hydrate();
  const readAt = Date.now();
  notifications = notifications.map((notification) => notification.department === department && (notification.audience !== "SUPERVISORS" || isSupervisor) && !notification.readAt ? { ...notification, readAt } : notification);
  persist();
  notify();
}

export function useDepartmentNotifications(department: string, isSupervisor = true) {
  const allNotifications = useSyncExternalStore(
    (listener) => { hydrate(); listeners.add(listener); return () => listeners.delete(listener); },
    () => { hydrate(); return notifications; },
    () => notifications,
  );
  return allNotifications.filter((notification) => notification.department === department && (notification.audience !== "SUPERVISORS" || isSupervisor));
}
