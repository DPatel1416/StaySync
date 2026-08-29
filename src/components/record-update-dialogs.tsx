"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LockKeyhole, X } from "lucide-react";
import { Button } from "./ui/button";
import { localDateTimeInputValue } from "@/lib/date-input-values";
import type { WorkOrder } from "@/lib/work-order-store";
import { useDepartments } from "@/lib/department-store";

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-brand disabled:bg-slate-50 disabled:text-slate-500";
const textareaClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand disabled:bg-slate-50 disabled:text-slate-500";

function Label({ children }: { children: React.ReactNode }) { return <span className="mb-1.5 block text-sm font-semibold text-slate-700">{children}</span>; }

function EditorFrame({ open, onClose, title, description, canEdit, canDelete = false, children, onSubmit, onDelete }: { open: boolean; onClose: () => void; title: string; description: string; canEdit: boolean; canDelete?: boolean; children: React.ReactNode; onSubmit: (data: FormData) => void; onDelete?: () => void }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm"/><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-xl font-bold tracking-tight text-slate-950">{title}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">{description}</Dialog.Description></div><Dialog.Close className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-5"/></Dialog.Close></div>{!canEdit && <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><LockKeyhole className="mt-0.5 size-4 shrink-0"/><p>This record is read-only for your department. Only the department currently assigned to it can make changes.</p></div>}<form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); if (!canEdit) return; onSubmit(new FormData(event.currentTarget)); onClose(); }}>{children}{confirmingDelete && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">Delete this record permanently? This action cannot be undone.</div>}<div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">{canDelete && <Button type="button" variant="danger" className="mr-auto" onClick={() => { if (confirmingDelete) { onDelete?.(); onClose(); } else setConfirmingDelete(true); }}>{confirmingDelete ? "Confirm delete" : "Delete"}</Button>}<Dialog.Close asChild><Button type="button" variant="secondary">Close</Button></Dialog.Close>{canEdit && <Button type="submit">Save changes</Button>}</div></form></Dialog.Content></Dialog.Portal></Dialog.Root>;
}

export type EditableRequest = { id: string; title: string; description?: string; location: string; from: string; assigned: string; assignedUser?: string; priority: string; status: string; due: string; createdAt?: number; createdBy?: string };
export function ServiceRequestEditor({ request, currentDepartment = "Front Desk", currentUserName, isDepartmentSupervisor = false, assigneeOptions = [], onClose, onSave, onDelete }: { request: EditableRequest | null; currentDepartment?: string; currentUserName?: string; isDepartmentSupervisor?: boolean; assigneeOptions?: string[]; onClose: () => void; onSave: (request: EditableRequest) => void; onDelete?: (request: EditableRequest) => void }) {
  const departments = useDepartments();
  if (!request) return null;
  const isHousekeeping = currentDepartment === "Housekeeping";
  const usesSupervisorQueue = currentDepartment === "Housekeeping" || currentDepartment === "Maintenance";
  const canEdit = currentDepartment === "Management" || (request.assigned === currentDepartment && (!usesSupervisorQueue || isDepartmentSupervisor || request.assignedUser === currentUserName));
  const canRouteDepartment = currentDepartment === "Management" || (!usesSupervisorQueue && canEdit);
  const canUpdateStatus = canEdit && !(usesSupervisorQueue && isDepartmentSupervisor);
  const canDelete = Boolean(currentUserName && request.createdBy === currentUserName && request.createdAt && Date.now() - request.createdAt <= 10 * 60 * 1000);
  return <EditorFrame open title={`Update ${request.id}`} description={usesSupervisorQueue && isDepartmentSupervisor ? `Assign this request to a ${currentDepartment} employee, then track it through completion.` : "Update progress for this assigned request. Changes are recorded in the activity timeline."} canEdit={canEdit} canDelete={canDelete} onDelete={() => onDelete?.(request)} onClose={onClose} onSubmit={(data) => { const assignedUser = String(data.get("assignedUser") || request.assignedUser || "Unassigned"); const selectedStatus = String(data.get("status") || request.status); onSave({ ...request, assigned: String(data.get("department") || request.assigned), assignedUser, priority: String(data.get("priority") || request.priority), status: selectedStatus === "Open" && assignedUser !== "Unassigned" ? "Assigned" : selectedStatus, due: String(data.get("due") || request.due) }); }}>
    <div className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-900">{request.title}</p><p className="mt-1 text-sm text-slate-500">{request.location} · Requested by {request.from}</p>{request.description && <p className="mt-2 text-sm leading-6 text-slate-700">{request.description}</p>}</div>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label>Status</Label><select aria-label="Status" name="status" defaultValue={request.status} disabled={!canUpdateStatus} className={inputClass}><option>Open</option><option>Assigned</option><option>In Progress</option><option>Waiting</option><option>Completed</option><option>Cancelled</option></select>{usesSupervisorQueue && isDepartmentSupervisor && <span className="mt-1.5 block text-xs text-slate-500">Status is updated by the assigned employee.</span>}</label><label><Label>Assigned department</Label><select name="department" defaultValue={request.assigned} disabled={!canRouteDepartment} className={inputClass}>{departments.map((department) => <option key={department.workspace}>{department.name}</option>)}<option>Management</option></select></label></div>
    {usesSupervisorQueue && isDepartmentSupervisor && <label><Label>Assigned {currentDepartment} employee</Label><select name="assignedUser" defaultValue={request.assignedUser ?? "Unassigned"} className={inputClass}>{assigneeOptions.map((employee) => <option key={employee}>{employee}</option>)}</select></label>}
    <div className="grid gap-4 sm:grid-cols-2"><label><Label>Priority</Label><select name="priority" defaultValue={request.priority} disabled={!canEdit || isHousekeeping} className={inputClass}><option>Standard</option><option>Important</option><option>High</option><option>Urgent</option></select></label><label><Label>Due</Label><input name="due" defaultValue={request.due} disabled={!canEdit || isHousekeeping} className={inputClass}/></label></div>
    <label><Label>Update note</Label><textarea name="note" rows={3} disabled={!canEdit} className={textareaClass} placeholder="Explain what changed or what happens next."/></label>
  </EditorFrame>;
}

export function WorkOrderEditor({ workOrder, canAssign = true, assignees = [], onClose, onSave }: { workOrder: WorkOrder | null; canAssign?: boolean; assignees?: string[]; onClose: () => void; onSave: (workOrder: WorkOrder, releasedToHousekeeping: boolean) => void }) {
  if (!workOrder) return null;
  const roomNumber = workOrder.location.match(/^Room\s+(\d+)/i)?.[1];
  return <EditorFrame open title={`Update ${workOrder.id}`} description="Record Maintenance progress, assignment, and completion details." canEdit onClose={onClose} onSubmit={(data) => {
    const status = String(data.get("status")) as WorkOrder["status"];
    const released = data.get("releasedToHousekeeping") === "on";
    onSave({ ...workOrder, status, assignee: String(data.get("assignee") ?? workOrder.assignee), priority: String(data.get("priority")), completionNotes: String(data.get("completionNotes")), requiresHousekeepingClearance: workOrder.requiresHousekeepingClearance }, released);
  }}>
    <div className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-900">{workOrder.title}</p><p className="mt-1 text-sm text-slate-500">{workOrder.location} · {workOrder.category}</p>{workOrder.description && <p className="mt-2 text-sm leading-6 text-slate-700">{workOrder.description}</p>}</div>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label>Status</Label><select aria-label="Work order status" name="status" defaultValue={workOrder.status} className={inputClass}><option>Open</option><option>Assigned</option><option>In Progress</option><option>Waiting</option><option>Completed</option><option>Cancelled</option></select></label><label><Label>Assigned technician</Label><select name="assignee" defaultValue={workOrder.assignee} disabled={!canAssign} className={inputClass}><option>Unassigned</option>{assignees.map((assignee) => <option key={assignee}>{assignee}</option>)}</select>{!canAssign && <span className="mt-1.5 block text-xs text-slate-500">Only a Maintenance supervisor can reassign work.</span>}</label></div>
    <label><Label>Priority</Label><select name="priority" defaultValue={workOrder.priority} className={inputClass}><option>Standard</option><option>High</option><option>Urgent</option></select></label>
    <label><Label>Completion or progress notes</Label><textarea name="completionNotes" rows={3} defaultValue={workOrder.completionNotes} className={textareaClass} placeholder="Record the repair completed, testing performed, parts used, or reason work is waiting."/></label>
    {workOrder.requiresHousekeepingClearance && roomNumber && <label className="flex min-h-11 items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"><input name="releasedToHousekeeping" type="checkbox" className="mt-0.5 size-4 rounded border-emerald-300 text-emerald-700"/><span><strong className="block">Release Room {roomNumber} to Housekeeping</strong><span className="mt-0.5 block text-xs leading-5 text-emerald-800">Use this only when the work is completed and the room is safe for Housekeeping to enter.</span></span></label>}
  </EditorFrame>;
}

export type EditableLog = { id: string; author: string; department: string; sharedWith?: string[]; time: string; message: string; priority: string; pinned: boolean; createdAt?: number };
const operationLogModificationWindow = 15 * 60 * 1000;
export function canModifyOperationLog(log: EditableLog, currentUserName: string, now = Date.now()) {
  if (log.author !== currentUserName || !log.createdAt) return false;
  const age = now - log.createdAt;
  return age >= 0 && age <= operationLogModificationWindow;
}
export function OperationLogEditor({ log, currentUserName = "Current user", onClose, onSave, onDelete }: { log: EditableLog | null; currentUserName?: string; onClose: () => void; onSave: (log: EditableLog) => void; onDelete?: (log: EditableLog) => void }) {
  const departments = useDepartments();
  if (!log) return null;
  const canEdit = canModifyOperationLog(log, currentUserName);
  return <EditorFrame open title="Edit Operations Log entry" description="You can edit or delete your entry for 15 minutes after posting. After that, the original entry is locked." canEdit={canEdit} canDelete={canEdit} onDelete={() => onDelete?.(log)} onClose={onClose} onSubmit={(data) => onSave({ ...log, message: String(data.get("message")), sharedWith: String(data.get("sharedWith")) ? [String(data.get("sharedWith"))] : [], priority: String(data.get("priority")), pinned: data.get("pinned") === "on" })}>
    <label><Label>Update</Label><textarea name="message" required rows={4} defaultValue={log.message} disabled={!canEdit} className={textareaClass}/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label>Share with another department</Label><select name="sharedWith" defaultValue={log.sharedWith?.[0] ?? ""} disabled={!canEdit} className={inputClass}><option value="">Department only</option>{departments.map((department) => <option key={department.workspace}>{department.name}</option>)}<option>Management</option></select></label><label><Label>Priority</Label><select name="priority" defaultValue={log.priority} disabled={!canEdit} className={inputClass}><option>Standard</option><option>Important</option><option>Urgent</option></select></label></div>
    <label className="flex min-h-11 items-center gap-3 text-sm text-slate-600"><input name="pinned" type="checkbox" defaultChecked={log.pinned} disabled={!canEdit} className="size-4 rounded border-slate-300 text-brand"/>Pin this entry</label>
  </EditorFrame>;
}

export type EditableOperationalRecord = { id?: string; title: string; detail: string; status: string; tone: "neutral" | "info" | "success" | "warning" | "urgent"; assignedDepartment?: string; createdByDepartment?: string; room?: string; foundAt?: string; foundLocation?: string; storageLocation?: string; createdAt?: number; createdBy?: string };
export function IncidentEditor({ record, currentDepartment, onClose, onSave, onDelete }: { record: EditableOperationalRecord | null; currentDepartment: string; onClose: () => void; onSave: (record: EditableOperationalRecord) => void; onDelete?: (record: EditableOperationalRecord) => void }) {
  const departments = useDepartments();
  if (!record) return null;
  const assignedDepartment = record.assignedDepartment ?? record.detail.match(/Assigned to ([^·]+)$/)?.[1]?.trim() ?? "Management";
  const canEdit = assignedDepartment === currentDepartment;
  const canDelete = record.createdBy === "You" && Boolean(record.createdAt && Date.now() - record.createdAt <= 10 * 60 * 1000);
  return <EditorFrame open title="Update incident" description="View the current status. Only the assigned department can update this incident." canEdit={canEdit} canDelete={canDelete} onDelete={() => onDelete?.(record)} onClose={onClose} onSubmit={(data) => onSave({ ...record, assignedDepartment: String(data.get("department")), detail: `${String(data.get("location"))} · Assigned to ${String(data.get("department"))}`, status: String(data.get("status")), tone: String(data.get("status")) === "Resolved" ? "success" : "warning" })}>
    <div className="rounded-xl bg-slate-50 p-4 font-semibold text-slate-900">{record.title}</div><label><Label>Room or location</Label><input name="location" defaultValue={record.detail.split(" · ")[0]} disabled={!canEdit} className={inputClass}/></label><div className="grid gap-4 sm:grid-cols-2"><label><Label>Status</Label><select name="status" defaultValue={record.status} disabled={!canEdit} className={inputClass}><option>Open</option><option>Awaiting review</option><option>In Progress</option><option>Follow-up required</option><option>Resolved</option><option>Closed</option></select></label><label><Label>Assigned department</Label><select name="department" defaultValue={assignedDepartment} disabled={!canEdit} className={inputClass}><option>Management</option>{departments.map((department) => <option key={department.workspace}>{department.name}</option>)}</select></label></div><label><Label>Internal update</Label><textarea name="note" rows={3} disabled={!canEdit} className={textareaClass} placeholder="Add the latest action or review note."/></label>
  </EditorFrame>;
}

export function LostFoundEditor({ record, onClose, onSave, onDelete }: { record: EditableOperationalRecord | null; onClose: () => void; onSave: (record: EditableOperationalRecord) => void; onDelete?: (record: EditableOperationalRecord) => void }) {
  if (!record) return null;
  const stored = record.storageLocation ?? record.detail.match(/Stored in (.*)$/)?.[1] ?? "";
  const canDelete = record.createdBy === "You" && Boolean(record.createdAt && Date.now() - record.createdAt <= 10 * 60 * 1000);
  return <EditorFrame open title="Update lost and found item" description="Update guest-room details, secure storage, and pickup or shipping progress." canEdit canDelete={canDelete} onDelete={() => onDelete?.(record)} onClose={onClose} onSubmit={(data) => { const storage = String(data.get("storage")); const foundLocation = String(data.get("foundLocation")); const room = String(data.get("room")); const foundAt = String(data.get("foundAt")); onSave({ ...record, room, foundAt, foundLocation, storageLocation: storage, detail: `Found in ${foundLocation}${room ? ` · Room ${room}` : ""} · Found ${foundAt} · Stored in ${storage}`, status: String(data.get("status")), tone: String(data.get("status")) === "Returned to guest" ? "success" : "info" }); }}>
    <div className="rounded-xl bg-slate-50 p-4 font-semibold text-slate-900">{record.title}</div><div className="grid gap-4 sm:grid-cols-2"><label><Label>Guest room number</Label><input name="room" inputMode="numeric" defaultValue={record.room ?? ""} className={inputClass}/></label><label><Label>Found date and time</Label><input name="foundAt" type="datetime-local" required defaultValue={record.foundAt ?? localDateTimeInputValue()} className={inputClass}/></label></div><label><Label>Found location</Label><input name="foundLocation" required defaultValue={record.foundLocation ?? record.detail.match(/Found in ([^·]+)/)?.[1]?.trim() ?? ""} className={inputClass}/></label><label><Label>Storage location</Label><input name="storage" required defaultValue={stored} className={inputClass}/></label><label><Label>Follow-up status</Label><select name="status" defaultValue={record.status} className={inputClass}><option>Not started</option><option>Guest contacted</option><option>Pickup arranged</option><option>Shipping arranged</option><option>Returned to guest</option><option>Disposed per policy</option></select></label><label><Label>Handling note</Label><textarea name="note" rows={3} className={textareaClass} placeholder="Add pickup, shipping, or disposition details."/></label>
  </EditorFrame>;
}
