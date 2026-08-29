"use client";

import { createOperationsStore } from "./operations-store";

export type DirectoryEmployee = { id: string; name: string; department: string; title: string; isSupervisor: boolean };
const store = createOperationsStore<DirectoryEmployee>("employees");
export const useEmployeeDirectory = store.useRecords;
