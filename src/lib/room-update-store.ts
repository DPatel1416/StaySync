"use client";

import { useSyncExternalStore } from "react";
import { roomUpdates as seedRoomUpdates } from "./demo-data";

export type RoomUpdate = (typeof seedRoomUpdates)[number] & { id?: string; createdBy?: string };

let updates: RoomUpdate[] = [...seedRoomUpdates];
const listeners = new Set<() => void>();

export function addRoomUpdate(update: RoomUpdate) {
  updates = [update, ...updates];
  listeners.forEach((listener) => listener());
}

export function useRoomUpdates() {
  return useSyncExternalStore<RoomUpdate[]>(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => updates,
    () => seedRoomUpdates as RoomUpdate[],
  );
}
