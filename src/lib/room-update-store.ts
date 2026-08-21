"use client";

import { useSyncExternalStore } from "react";
import { roomUpdates as seedRoomUpdates } from "./demo-data";

export type RoomUpdate = { id?: string; room: string; type: string; detail: string; time: string; state: string; createdBy?: string };

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

export function useRoomUpdates() {
  return useSyncExternalStore<RoomUpdate[]>(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => updates,
    () => seedRoomUpdates as RoomUpdate[],
  );
}
