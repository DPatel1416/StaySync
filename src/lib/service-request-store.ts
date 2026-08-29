"use client";

import { createOperationsStore } from "./operations-store";

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

const store = createOperationsStore<ServiceRequest>("service-requests");

export function addServiceRequest(request: ServiceRequest) {
  store.add(request);
}

export function updateServiceRequest(updated: ServiceRequest) {
  store.update(updated);
}

export function deleteServiceRequest(id: string) {
  store.remove(id);
}

export function getServiceRequests() {
  return store.get();
}

export function useServiceRequests() {
  return store.useRecords();
}
