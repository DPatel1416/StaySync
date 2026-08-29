"use client";

import { useEffect, useMemo, useState } from "react";
import { createOperationsStore } from "./operations-store";

export type RoomUpdate = { id?: string; room: string; type: string; detail: string; time: string; state: string; createdBy?: string; expiresAt?: number };

const store = createOperationsStore<Required<Pick<RoomUpdate, "id">> & RoomUpdate>("room-updates");

export function addRoomUpdate(update: RoomUpdate) {
  store.add({ ...update, id: update.id ?? `pending-${Date.now()}` });
}

export function updateRoomUpdateState(id: string | undefined, fallbackKey: string, state: string) {
  const target = store.get().find((update) => (id ? update.id === id : `${update.room}-${update.type}` === fallbackKey));
  if (target) store.update({ ...target, state });
}

export function markRoomClearedByMaintenance(room: string, actor: string) {
  const existing = store.get().find((update) => update.room === room && update.type === "Out of service");
  const cleared = { id: existing?.id ?? `pending-${Date.now()}`, room, type: existing ? "Out of service" : "Maintenance clearance", detail: `Maintenance cleared room ${room}. Housekeeping may assign the room for cleaning.`, time: "Just now", state: "Ready to assign", createdBy: actor };
  if (existing) store.update(cleared); else store.add(cleared);
}

export function isInformationalRoomChange(update: Pick<RoomUpdate, "type">) {
  const type = update.type.toLowerCase();
  return type.includes("late checkout") || type.includes("early checkout") || type.includes("stayover") || type.includes("extended stay") || type.includes("extension");
}

export function isRoomUpdateVisible(update: RoomUpdate, now = Date.now()) {
  return !isInformationalRoomChange(update) || !update.expiresAt || update.expiresAt > now;
}

export function useRoomUpdates() {
  const allUpdates = store.useRecords();
  const [now, setNow] = useState(() => Date.now());
  const nextExpiration = useMemo(() => allUpdates.filter((update) => isInformationalRoomChange(update) && update.expiresAt && update.expiresAt > now).reduce<number | undefined>((next, update) => next === undefined || update.expiresAt! < next ? update.expiresAt : next, undefined), [allUpdates, now]);
  useEffect(() => {
    if (!nextExpiration) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(nextExpiration - Date.now() + 50, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [nextExpiration]);
  return useMemo(() => allUpdates.filter((update) => isRoomUpdateVisible(update, now)), [allUpdates, now]);
}
