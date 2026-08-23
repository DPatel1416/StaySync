"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { roomUpdates as seedRoomUpdates } from "./demo-data";
import { publishBrowserState, subscribeBrowserState } from "./browser-live-sync";

export type RoomUpdate = { id?: string; room: string; type: string; detail: string; time: string; state: string; createdBy?: string; expiresAt?: number };

let updates: RoomUpdate[] = [...seedRoomUpdates];
const listeners = new Set<() => void>();
const storageKey = "staysync-room-updates";
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) updates = JSON.parse(stored) as RoomUpdate[];
  } catch {
    updates = [...seedRoomUpdates];
  }
  subscribeBrowserState(storageKey, (value) => {
    try { updates = value ? JSON.parse(value) as RoomUpdate[] : [...seedRoomUpdates]; } catch { updates = [...seedRoomUpdates]; }
    listeners.forEach((listener) => listener());
  });
}

function persist() {
  publishBrowserState(storageKey, JSON.stringify(updates));
}

export function addRoomUpdate(update: RoomUpdate) {
  hydrate();
  updates = [update, ...updates];
  persist();
  listeners.forEach((listener) => listener());
}

export function updateRoomUpdateState(id: string | undefined, fallbackKey: string, state: string) {
  hydrate();
  updates = updates.map((update) => (id ? update.id === id : `${update.room}-${update.type}` === fallbackKey) ? { ...update, state } : update);
  persist();
  listeners.forEach((listener) => listener());
}

export function isInformationalRoomChange(update: Pick<RoomUpdate, "type">) {
  const type = update.type.toLowerCase();
  return type.includes("late checkout") || type.includes("early checkout") || type.includes("stayover") || type.includes("extended stay") || type.includes("extension");
}

export function isRoomUpdateVisible(update: RoomUpdate, now = Date.now()) {
  return !isInformationalRoomChange(update) || !update.expiresAt || update.expiresAt > now;
}

export function useRoomUpdates() {
  const allUpdates = useSyncExternalStore<RoomUpdate[]>(
    (listener) => { hydrate(); listeners.add(listener); return () => listeners.delete(listener); },
    () => { hydrate(); return updates; },
    () => seedRoomUpdates as RoomUpdate[],
  );
  const [now, setNow] = useState(() => Date.now());
  const nextExpiration = useMemo(() => allUpdates.filter((update) => isInformationalRoomChange(update) && update.expiresAt && update.expiresAt > now).reduce<number | undefined>((next, update) => next === undefined || update.expiresAt! < next ? update.expiresAt : next, undefined), [allUpdates, now]);
  useEffect(() => {
    if (!nextExpiration) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(nextExpiration - Date.now() + 50, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [nextExpiration]);
  return useMemo(() => allUpdates.filter((update) => isRoomUpdateVisible(update, now)), [allUpdates, now]);
}
