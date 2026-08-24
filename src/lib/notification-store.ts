"use client";

import { useSyncExternalStore } from "react";
import { publishBrowserState, subscribeBrowserState } from "./browser-live-sync";

export type DepartmentNotification = {
  id: string;
  department: string;
  title: string;
  message: string;
  serviceRequestId: string;
  href?: string;
  createdAt: number;
  createdBy: string;
  readAt?: number;
  audience?: "DEPARTMENT" | "SUPERVISORS";
  tone?: "info" | "warning" | "urgent";
  kind?: "REMINDER" | "SERVICE_REQUEST" | "ROOM_ISSUE" | "SOS" | "SUPPORT" | "INSPECTION" | "ROOM_CLEARANCE";
};

let notifications: DepartmentNotification[] = [];
const listeners = new Set<() => void>();
const storageKey = "staysync-department-notifications";
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) notifications = JSON.parse(stored) as DepartmentNotification[];
  } catch {
    notifications = [];
  }
  subscribeBrowserState(storageKey, (value) => {
    try { notifications = value ? JSON.parse(value) as DepartmentNotification[] : []; } catch { notifications = []; }
    notify();
  });
}

function persist() {
  publishBrowserState(storageKey, JSON.stringify(notifications));
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
  playNotificationSound(notification.tone === "urgent" ? "urgent" : "standard");
  return created;
}

function playNotificationSound(kind: "standard" | "urgent") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const tones = kind === "urgent" ? [660, 880, 660] : [660];
    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startsAt = context.currentTime + index * 0.16;
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.0001, startsAt);
      gain.gain.exponentialRampToValueAtTime(0.12, startsAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.12);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startsAt);
      oscillator.stop(startsAt + 0.13);
    });
    window.setTimeout(() => void context.close(), kind === "urgent" ? 650 : 250);
  } catch {
    // Browsers may block sound until the user has interacted with the page.
  }
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

export function markDepartmentNotificationRead(id: string) {
  hydrate();
  const readAt = Date.now();
  notifications = notifications.map((notification) => notification.id === id && !notification.readAt ? { ...notification, readAt } : notification);
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
