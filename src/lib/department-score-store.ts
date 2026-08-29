"use client";

import { createOperationsStore } from "./operations-store";

export type DepartmentScore = {
  id: string; property: string; department: string; score: number;
  previousScore?: number; target: number; reviewDate: string;
  reviewType: string; reviewer: string; comments: string; followUp: boolean;
};

const store = createOperationsStore<DepartmentScore>("department-scores");
export const useDepartmentScores = store.useRecords;
export const addDepartmentScore = store.add;
export const updateDepartmentScore = store.update;
