"use client";

import { useSyncExternalStore } from "react";
import { createOperationalRecord, deleteOperationalRecord, loadOperationalRecords, updateOperationalRecord, type OperationsResource } from "./operations-client";

/**
 * Small external-store adapter used by operational modules. Supabase remains the
 * source of truth; optimistic records only bridge the network round trip.
 */
export function createOperationsStore<T extends { id: string }>(resource: OperationsResource) {
  let records: T[] = [];
  const serverRecords: T[] = [];
  let loaded = false;
  let loading: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const subscribe = (listener: () => void) => { listeners.add(listener); void load(); return () => listeners.delete(listener); };
  const getSnapshot = () => records;
  const getServerSnapshot = () => serverRecords;
  const load = () => {
    if (loaded) return Promise.resolve();
    if (loading) return loading;
    loading = loadOperationalRecords<T>(resource).then((next) => { records = next; loaded = true; notify(); }).catch(() => { records = []; loaded = true; notify(); }).finally(() => { loading = null; });
    return loading;
  };
  return {
    get() { void load(); return records; },
    add(record: T) {
      records = [record, ...records]; notify();
      void createOperationalRecord(resource, record).then((saved) => {
        records = [saved, ...records.filter((item) => item.id !== record.id && item.id !== saved.id)];
        notify();
      }).catch(() => { records = records.filter((item) => item.id !== record.id); notify(); });
    },
    update(record: T) {
      const previous = records.find((item) => item.id === record.id);
      records = records.map((item) => item.id === record.id ? record : item); notify();
      void updateOperationalRecord(resource, record).then((saved) => { records = records.map((item) => item.id === saved.id ? saved : item); notify(); }).catch(() => { if (previous) records = records.map((item) => item.id === record.id ? previous : item); notify(); });
    },
    remove(id: string) {
      const previous = records;
      records = records.filter((item) => item.id !== id); notify();
      void deleteOperationalRecord(resource, id).catch(() => { records = previous; notify(); });
    },
    useRecords() {
      return useSyncExternalStore<T[]>(subscribe, getSnapshot, getServerSnapshot);
    },
  };
}
