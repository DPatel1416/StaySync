"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, BellRing, Check, PackageSearch, Plus, ShieldAlert, X } from "lucide-react";
import { Button } from "./ui/button";

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-brand";
const textareaClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand";

type DialogFrameProps = {
  title: string;
  description: string;
  triggerLabel: string;
  submitLabel: string;
  defaultOpen?: boolean;
  icon?: React.ElementType;
  children: React.ReactNode;
  onSubmit: (data: FormData) => void;
};

function DialogFrame({ title, description, triggerLabel, submitLabel, defaultOpen = false, icon: Icon = Plus, children, onSubmit }: DialogFrameProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [saved, setSaved] = useState(false);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
    setSaved(true);
    window.setTimeout(() => { setSaved(false); setOpen(false); }, 500);
  }
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><Button><Icon className="size-4"/>{triggerLabel}</Button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm"/>
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-xl font-bold tracking-tight text-slate-950">{title}</Dialog.Title><Dialog.Description className="mt-1 text-sm leading-5 text-slate-500">{description}</Dialog.Description></div><Dialog.Close className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-5"/></Dialog.Close></div>
        <form onSubmit={submit} className="mt-6 space-y-4">{children}<div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><Dialog.Close asChild><Button type="button" variant="secondary">Cancel</Button></Dialog.Close><Button type="submit">{saved ? <><Check className="size-4"/>Saved</> : submitLabel}</Button></div></form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <span className="mb-1.5 block text-sm font-semibold text-slate-700">{children}{required && <span className="text-rose-600"> *</span>}</span>;
}

export type ServiceRequestDraft = { title: string; location: string; department: string; priority: string; due: string };
export function ServiceRequestDialog({ defaultOpen, onCreate }: { defaultOpen?: boolean; onCreate: (draft: ServiceRequestDraft) => void }) {
  return <DialogFrame title="Create service request" description="Send an operational request to the department responsible for completing it." triggerLabel="Create service request" submitLabel="Create request" defaultOpen={defaultOpen} onSubmit={(data) => onCreate({ title: String(data.get("title")), location: String(data.get("location")), department: String(data.get("department")), priority: String(data.get("priority")), due: String(data.get("due")) })}>
    <label className="block"><Label required>Request title</Label><input name="title" required className={inputClass} placeholder="What is needed?"/></label>
    <label className="block"><Label required>Description</Label><textarea name="description" required rows={3} className={textareaClass} placeholder="Add the details the receiving department needs."/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Room or location</Label><input name="location" required className={inputClass} placeholder="Room 604 or Lobby"/></label><label><Label required>Assign to department</Label><select name="department" required defaultValue="" className={inputClass}><option value="" disabled>Select department</option><option>Housekeeping</option><option>Maintenance</option><option>Kitchen</option><option>Front Desk</option><option>Management</option></select></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Priority</Label><select name="priority" required defaultValue="Standard" className={inputClass}><option>Standard</option><option>Important</option><option>High</option><option>Urgent</option></select></label><label><Label>Due date and time</Label><input name="due" type="datetime-local" className={inputClass}/></label></div>
    <label className="flex min-h-11 items-center gap-3 text-sm text-slate-600"><input name="notify" type="checkbox" defaultChecked className="size-4 rounded border-slate-300 text-brand"/>Notify the assigned department immediately</label>
  </DialogFrame>;
}

export type HousekeepingRoomIssueDraft = { room: string; issue: string; description: string; urgency: string };
export function HousekeepingRoomIssueDialog({ onCreate }: { onCreate: (draft: HousekeepingRoomIssueDraft) => void }) {
  return <DialogFrame title="Report room issue" description="Send an issue from one of your assigned rooms directly to the Housekeeping supervisor." triggerLabel="Report room issue" submitLabel="Send to supervisor" icon={AlertTriangle} onSubmit={(data) => onCreate({ room: String(data.get("room")), issue: String(data.get("issue")), description: String(data.get("description")), urgency: String(data.get("urgency")) })}>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Only Housekeeping supervisors receive this report. They can review it and assign the follow-up work.</div>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Room number</Label><input name="room" required inputMode="numeric" className={inputClass} placeholder="307"/></label><label><Label required>Issue type</Label><select name="issue" required defaultValue="" className={inputClass}><option value="" disabled>Select issue</option><option>Cleaning supplies needed</option><option>Linen or bedding</option><option>Room damage</option><option>Missing item</option><option>Maintenance needed</option><option>Safety concern</option><option>Other</option></select></label></div>
    <label className="block"><Label required>What did you find?</Label><textarea name="description" required rows={3} className={textareaClass} placeholder="Add the details your supervisor needs to decide the next action."/></label>
    <label><Label required>Urgency</Label><select name="urgency" required defaultValue="Standard" className={inputClass}><option>Standard</option><option>Important</option><option>Urgent</option></select></label>
  </DialogFrame>;
}

export type HousekeepingSosDraft = { location: string; note: string };
export function HousekeepingSosDialog({ locations, onSend }: { locations: string[]; onSend: (draft: HousekeepingSosDraft) => void }) {
  const suggestions = [...new Set(locations)];
  return <DialogFrame title="Emergency SOS" description="Tell your Housekeeping supervisor where you are so they can come directly to you." triggerLabel="Emergency SOS" submitLabel="Send SOS" icon={BellRing} onSubmit={(data) => onSend({ location: String(data.get("location")), note: String(data.get("note")) })}>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950">This sends a direct emergency alert to your supervisor. It does not create a service request or assign work to another attendant.</div>
    <label className="block"><Label required>Current room or location</Label><input name="location" required list="housekeeping-sos-locations" className={inputClass} placeholder="Room 307, third-floor hall, or linen room" autoComplete="off"/><datalist id="housekeeping-sos-locations">{suggestions.map((location) => <option key={location} value={location}/>)}</datalist><span className="mt-1.5 block text-xs text-slate-500">Choose an assigned room or enter your exact current location.</span></label>
    <label className="block"><Label>What help do you need?</Label><textarea name="note" rows={2} className={textareaClass} placeholder="Optional short detail for your supervisor."/></label>
  </DialogFrame>;
}

export type OperationLogDraft = { message: string; sharedWith: string; priority: string };
export function OperationLogDialog({ defaultOpen, onCreate }: { defaultOpen?: boolean; onCreate: (draft: OperationLogDraft) => void }) {
  return <DialogFrame title="Add Operations Log entry" description="Post to your department log. You can optionally share the entry with another department." triggerLabel="Add operations log" submitLabel="Publish update" defaultOpen={defaultOpen} onSubmit={(data) => onCreate({ message: String(data.get("message")), sharedWith: String(data.get("sharedWith")), priority: String(data.get("priority")) })}>
    <label className="block"><Label required>Update</Label><textarea name="message" required rows={4} className={textareaClass} placeholder="Write a clear operational update…"/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label>Share with another department</Label><select name="sharedWith" defaultValue="" className={inputClass}><option value="">Department only</option><option>Front Desk</option><option>Maintenance</option><option>Housekeeping</option><option>Kitchen</option><option>Management</option></select><span className="mt-1.5 block text-xs text-slate-400">Optional. Shared entries appear in both department logs.</span></label><label><Label required>Priority</Label><select name="priority" required defaultValue="Standard" className={inputClass}><option>Standard</option><option>Important</option><option>Urgent</option></select><span className="mt-1.5 block text-xs text-slate-400">Urgent entries appear ahead of routine updates.</span></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label>Expiration date</Label><input name="expires" type="date" className={inputClass}/></label><label><Label>Attachment</Label><input name="attachment" type="file" className="block h-11 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-brand"/></label></div>
    <label className="flex min-h-11 items-center gap-3 text-sm text-slate-600"><input name="pinned" type="checkbox" className="size-4 rounded border-slate-300 text-brand"/>Pin this entry for the selected audience</label>
  </DialogFrame>;
}

export type IncidentDraft = { category: string; location: string; department: string; priority: string; description: string };
export function IncidentDialog({ defaultOpen, onCreate }: { defaultOpen?: boolean; onCreate: (draft: IncidentDraft) => void }) {
  return <DialogFrame title="Report incident" description="Document what happened and route it to the department responsible for follow-up." triggerLabel="Report incident" submitLabel="Submit incident" defaultOpen={defaultOpen} icon={ShieldAlert} onSubmit={(data) => onCreate({ category: String(data.get("category")), location: String(data.get("location")), department: String(data.get("department")), priority: String(data.get("priority")), description: String(data.get("description")) })}>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Incident category</Label><select name="category" required defaultValue="" className={inputClass}><option value="" disabled>Select category</option><option>Guest safety</option><option>Property damage</option><option>Security</option><option>Service disruption</option><option>Guest relocation</option><option>Other</option></select></label><label><Label required>Room or location</Label><input name="location" required className={inputClass} placeholder="Room 604 or Pool corridor"/></label></div>
    <label className="block"><Label required>What happened?</Label><textarea name="description" required rows={4} className={textareaClass} placeholder="Record the facts, immediate action taken, and any follow-up needed."/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Assign to department</Label><select name="department" required defaultValue="Management" className={inputClass}><option>Management</option><option>Security</option><option>Maintenance</option><option>Housekeeping</option><option>Front Desk</option></select></label><label><Label required>Priority</Label><select name="priority" required defaultValue="Important" className={inputClass}><option>Standard</option><option>Important</option><option>High</option><option>Urgent</option></select></label></div>
    <label><Label>Supporting files</Label><input name="attachment" type="file" multiple className="block h-11 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-brand"/></label>
  </DialogFrame>;
}

export type LostFoundDraft = { item: string; room: string; foundLocation: string; foundAt: string; storedAt: string; followUp: string };
export function LostFoundDialog({ defaultOpen, onCreate }: { defaultOpen?: boolean; onCreate: (draft: LostFoundDraft) => void }) {
  return <DialogFrame title="Add lost and found item" description="Record where and when the item was found, including a guest room when known." triggerLabel="Add lost and found item" submitLabel="Save item" defaultOpen={defaultOpen} icon={PackageSearch} onSubmit={(data) => onCreate({ item: String(data.get("item")), room: String(data.get("room")), foundLocation: String(data.get("foundLocation")), foundAt: String(data.get("foundAt")), storedAt: String(data.get("storedAt")), followUp: String(data.get("followUp")) })}>
    <label className="block"><Label required>Item description</Label><textarea name="item" required rows={3} className={textareaClass} placeholder="Include color, brand, identifying marks, and contents when appropriate."/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label>Guest room number</Label><input name="room" inputMode="numeric" className={inputClass} placeholder="Optional, e.g. 412"/></label><label><Label required>Found date and time</Label><input name="foundAt" type="datetime-local" required className={inputClass}/></label></div>
    <label className="block"><Label required>Found location</Label><input name="foundLocation" required className={inputClass} placeholder="Guest room, Maple Room, or lobby"/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Storage location</Label><input name="storedAt" required className={inputClass} placeholder="Front Desk safe B-12"/></label><label><Label>Found by</Label><input value="Alex Morgan" readOnly className={`${inputClass} bg-slate-50 text-slate-500`}/></label></div>
    <label><Label required>Guest follow-up status</Label><select name="followUp" required defaultValue="Not started" className={inputClass}><option>Not started</option><option>Guest contacted</option><option>Pickup arranged</option><option>Shipping arranged</option><option>Unable to identify guest</option></select></label>
    <label><Label>Item photo</Label><input name="photo" type="file" accept="image/*" className="block h-11 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-brand"/></label>
    <label className="block"><Label>Notes</Label><textarea name="notes" rows={2} className={textareaClass} placeholder="Add handling or guest communication notes."/></label>
  </DialogFrame>;
}

export type LateCheckoutDraft = { room: string; originalTime: string; newTime: string; date: string; note: string };
export function LateCheckoutDialog({ defaultOpen, onCreate }: { defaultOpen?: boolean; onCreate: (draft: LateCheckoutDraft) => void }) {
  return <DialogFrame title="Add late checkout" description="Share a checkout-time change with Housekeeping so room assignments can be adjusted." triggerLabel="Add late checkout" submitLabel="Notify Housekeeping" defaultOpen={defaultOpen} onSubmit={(data) => onCreate({ room: String(data.get("room")), originalTime: String(data.get("originalTime")), newTime: String(data.get("newTime")), date: String(data.get("date")), note: String(data.get("note")) })}>
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">This update is automatically visible to Housekeeping. No priority or department assignment is required.</div>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Room number</Label><input name="room" required inputMode="numeric" className={inputClass} placeholder="412"/></label><label><Label required>Checkout date</Label><input name="date" type="date" required className={inputClass}/></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Original checkout time</Label><input name="originalTime" type="time" required defaultValue="11:00" className={inputClass}/></label><label><Label required>New checkout time</Label><input name="newTime" type="time" required defaultValue="13:00" className={inputClass}/></label></div>
    <label className="block"><Label>Operational note</Label><textarea name="note" rows={3} className={textareaClass} placeholder="Optional context for the Housekeeping team."/></label>
  </DialogFrame>;
}
