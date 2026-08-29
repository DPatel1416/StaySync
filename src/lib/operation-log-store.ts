"use client";

import { createOperationsStore } from "./operations-store";

export type OperationLogRecord = {
  id: string;
  author: string;
  department: string;
  sharedWith: string[];
  time: string;
  message: string;
  priority: string;
  pinned: boolean;
  createdAt?: number;
};

const store = createOperationsStore<OperationLogRecord>("operation-logs");
export function addOperationLog(record: OperationLogRecord) { store.add(record); }
export function updateOperationLog(record: OperationLogRecord) { store.update(record); }
export function deleteOperationLog(id: string) { store.remove(id); }
export function useOperationLogs() { return store.useRecords(); }
