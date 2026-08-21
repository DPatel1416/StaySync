"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { roomUpdates as seedRoomUpdates } from "./demo-data";

export type RoomUpdate = { id?: string; room: string; type: string; detail: string; time: string; state: string; createdBy?: string; expiresAt?: number };

let updates: RoomUpdate[] = [...seedRoomUpdates];
const listeners = new Set<() => void>();

export function addRoomUpdate(update: RoomUpdate) {
  updates = [update, ...updates];
  listeners.forEach((listener) => listener());
}

export function updateRoomUpdateState(id: string | undefined, fallbackKey: string, state: string) {
  updates = updates.map((update) => (id ? update.id === id : `${update.room}-${update.type}` === fallbackKey) ? { ...update, state } : update);
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
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => updates,
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
