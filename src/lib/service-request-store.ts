"use client";

import { useSyncExternalStore } from "react";
import { serviceRequests as seedServiceRequests } from "./demo-data";
import { publishBrowserState, subscribeBrowserState } from "./browser-live-sync";

export type ServiceRequest = {
  id: string;
  title: string;
  description?: string;
  location: string;
  from: string;
  assigned: string;
  assignedUser?: string;
  priority: string;
  status: string;
  due: string;
  createdAt?: number;
  createdBy?: string;
};

const seed = seedServiceRequests as ServiceRequest[];
let requests: ServiceRequest[] = [...seed];
const listeners = new Set<() => void>();
const storageKey = "staysync-service-requests";
let hydrated = false;

function notify() { listeners.forEach((listener) => listener()); }

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) requests = JSON.parse(stored) as ServiceRequest[];
  } catch {
    requests = [...seed];
  }
  subscribeBrowserState(storageKey, (value) => {
    try { requests = value ? JSON.parse(value) as ServiceRequest[] : [...seed]; } catch { requests = [...seed]; }
    notify();
  });
}

function persist() {
  publishBrowserState(storageKey, JSON.stringify(requests));
}

export function addServiceRequest(request: ServiceRequest) {
  hydrate();
  requests = [request, ...requests];
  persist();
  notify();
}

export function updateServiceRequest(updated: ServiceRequest) {
  hydrate();
  requests = requests.map((request) => request.id === updated.id ? updated : request);
  persist();
  notify();
}

export function deleteServiceRequest(id: string) {
  hydrate();
  requests = requests.filter((request) => request.id !== id);
  persist();
  notify();
}

export function useServiceRequests() {
  return useSyncExternalStore<ServiceRequest[]>(
    (listener) => { hydrate(); listeners.add(listener); return () => listeners.delete(listener); },
    () => { hydrate(); return requests; },
    () => seed,
  );
}
