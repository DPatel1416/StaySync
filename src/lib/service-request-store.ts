"use client";

import { useSyncExternalStore } from "react";
import { serviceRequests as seedServiceRequests } from "./demo-data";

export type ServiceRequest = {
  id: string;
  title: string;
  location: string;
  from: string;
  assigned: string;
  priority: string;
  status: string;
  due: string;
  createdAt?: number;
  createdBy?: string;
};

const seed = seedServiceRequests as ServiceRequest[];
let requests: ServiceRequest[] = [...seed];
const listeners = new Set<() => void>();

function notify() { listeners.forEach((listener) => listener()); }

export function addServiceRequest(request: ServiceRequest) {
  requests = [request, ...requests];
  notify();
}

export function updateServiceRequest(updated: ServiceRequest) {
  requests = requests.map((request) => request.id === updated.id ? updated : request);
  notify();
}

export function deleteServiceRequest(id: string) {
  requests = requests.filter((request) => request.id !== id);
  notify();
}

export function useServiceRequests() {
  return useSyncExternalStore<ServiceRequest[]>(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => requests,
    () => seed,
  );
}
