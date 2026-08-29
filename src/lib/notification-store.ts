"use client";

import { useEffect, useMemo, useState } from "react";
import { createOperationalRecord } from "./operations-client";
import { createOperationsStore } from "./operations-store";

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
  recipientName?: string;
  tone?: "info" | "warning" | "urgent";
  kind?: "REMINDER" | "SERVICE_REQUEST" | "ROOM_ISSUE" | "SOS" | "SUPPORT" | "INSPECTION" | "ROOM_CLEARANCE" | "MANAGER_CALL";
};

export const openedNotificationRetentionMs = 24 * 60 * 60 * 1000;
const store = createOperationsStore<DepartmentNotification>("notifications");

export function sendDepartmentReminder(notification: Omit<DepartmentNotification, "id" | "createdAt">) {
  const pending = { ...notification, id: `pending-${Date.now()}`, createdAt: Date.now() };
  void createOperationalRecord("notifications", pending).catch(() => undefined);
  playNotificationSound(notification.tone === "urgent" ? "urgent" : "standard");
  return pending;
}

function playNotificationSound(kind: "standard" | "urgent") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const tones = kind === "urgent" ? [660, 880, 660] : [660];
    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator(); const gain = context.createGain(); const startsAt = context.currentTime + index * 0.16;
      oscillator.frequency.value = frequency; oscillator.type = "sine"; gain.gain.setValueAtTime(0.0001, startsAt); gain.gain.exponentialRampToValueAtTime(0.12, startsAt + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.12); oscillator.connect(gain).connect(context.destination); oscillator.start(startsAt); oscillator.stop(startsAt + 0.13);
    });
    window.setTimeout(() => void context.close(), kind === "urgent" ? 650 : 250);
  } catch { /* Browsers may block sound until the user interacts with the page. */ }
}

function visible(records: DepartmentNotification[], now = Date.now()) { return records.filter((item) => !item.readAt || now - item.readAt < openedNotificationRetentionMs); }
export function getDepartmentNotifications() { return visible(store.get()); }

export function markDepartmentNotificationsRead(_department: string, _isSupervisor = true) {
  const readAt = Date.now();
  store.get().filter((item) => !item.readAt).forEach((item) => store.update({ ...item, readAt }));
}

export function markDepartmentNotificationRead(id: string) {
  const item = store.get().find((notification) => notification.id === id);
  if (item && !item.readAt) store.update({ ...item, readAt: Date.now() });
}

export function useDepartmentNotifications(_department: string, _isSupervisor = true, _recipientName?: string) {
  const notifications = store.useRecords();
  const [, refresh] = useState(0);
  const nextExpiry = useMemo(() => visible(notifications).filter((item) => item.readAt).reduce<number | null>((nearest, item) => { const expiresAt = item.readAt! + openedNotificationRetentionMs; return nearest === null || expiresAt < nearest ? expiresAt : nearest; }, null), [notifications]);
  useEffect(() => { if (nextExpiry === null) return; const timeout = window.setTimeout(() => refresh((value) => value + 1), Math.max(0, nextExpiry - Date.now()) + 10); return () => window.clearTimeout(timeout); }, [nextExpiry]);
  return visible(notifications);
}
