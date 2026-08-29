"use client";

import { createOperationsStore } from "./operations-store";
import type { EditableOperationalRecord } from "@/components/record-update-dialogs";

export type LostFoundRecord = EditableOperationalRecord & { id: string };
const store = createOperationsStore<LostFoundRecord>("lost-found");
export const useLostFoundRecords = store.useRecords;
export const addLostFoundRecord = store.add;
export const updateLostFoundRecord = store.update;
export const deleteLostFoundRecord = store.remove;
