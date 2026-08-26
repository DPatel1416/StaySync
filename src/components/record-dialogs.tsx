"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, BellRing, Check, PackageSearch, Plus, ShieldAlert, Wrench, X } from "lucide-react";
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
  triggerVariant?: "secondary";
  children: React.ReactNode;
  onSubmit: (data: FormData) => void | Promise<void>;
};

function DialogFrame({ title, description, triggerLabel, submitLabel, defaultOpen = false, icon: Icon = Plus, triggerVariant, children, onSubmit }: DialogFrameProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const closeTimer = useRef<number | null>(null);
  useEffect(() => () => { if (closeTimer.current !== null) window.clearTimeout(closeTimer.current); }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true); setSubmitError("");
    try {
      await onSubmit(new FormData(event.currentTarget));
      setSaved(true);
      closeTimer.current = window.setTimeout(() => { setSaved(false); setOpen(false); closeTimer.current = null; }, 500);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "The record could not be saved. Please try again.");
    } finally { setSubmitting(false); }
  }
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><Button variant={triggerVariant}><Icon className="size-4"/>{triggerLabel}</Button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm"/>
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-xl font-bold tracking-tight text-slate-950">{title}</Dialog.Title><Dialog.Description className="mt-1 text-sm leading-5 text-slate-500">{description}</Dialog.Description></div><Dialog.Close className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-5"/></Dialog.Close></div>
        <form onSubmit={submit} className="mt-6 space-y-4">{children}{submitError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><Dialog.Close asChild><Button type="button" variant="secondary">Cancel</Button></Dialog.Close><Button type="submit" disabled={submitting}>{saved ? <><Check className="size-4"/>Saved</> : submitting ? "Saving…" : submitLabel}</Button></div></form>
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
  return <SupervisorAssistanceDialog department="Housekeeping" locations={locations} urgent onSend={onSend}/>;
}

export type SupervisorAssistanceDraft = { location: string; note: string };
export function SupervisorAssistanceDialog({ department, locations, urgent = false, onSend }: { department: "Housekeeping" | "Maintenance"; locations: string[]; urgent?: boolean; onSend: (draft: SupervisorAssistanceDraft) => void }) {
  const suggestions = [...new Set(locations)];
  const action = urgent ? "Emergency SOS" : "Request Support";
  const listId = `${department.toLowerCase()}-${urgent ? "sos" : "support"}-locations`;
  return <DialogFrame title={action} description={`Tell your ${department} supervisor where you are so they can come directly to you.`} triggerLabel={action} submitLabel={urgent ? "Send SOS" : "Notify supervisor"} icon={BellRing} onSubmit={(data) => onSend({ location: String(data.get("location")), note: String(data.get("note")) })}>
    <div className={`rounded-xl border p-3 text-sm leading-5 ${urgent ? "border-amber-200 bg-amber-50 text-amber-950" : "border-sky-200 bg-sky-50 text-sky-950"}`}>This sends a direct {urgent ? "emergency alert" : "assistance notification"} to your supervisor. It does not create a service request or work order.</div>
    <label className="block"><Label required>Current room or location</Label><input name="location" required list={listId} className={inputClass} placeholder={department === "Maintenance" ? "Room 604, pool area, or mechanical room" : "Room 307, third-floor hall, or linen room"} autoComplete="off"/><datalist id={listId}>{suggestions.map((location) => <option key={location} value={location}/>)}</datalist><span className="mt-1.5 block text-xs text-slate-500">Choose an assigned location or enter exactly where you are now.</span></label>
    <label className="block"><Label>What help do you need?</Label><textarea name="note" rows={2} className={textareaClass} placeholder="Optional short detail for your supervisor."/></label>
  </DialogFrame>;
}

export type WorkOrderDraft = { title: string; description: string; location: string; category: string; priority: string; assignee: string; due: string; requiresHousekeepingClearance: boolean };
export function WorkOrderDialog({ defaultOpen, onCreate }: { defaultOpen?: boolean; onCreate: (draft: WorkOrderDraft) => void }) {
  const [category, setCategory] = useState("");
  return <DialogFrame title="Create work order" description="Create an internal Maintenance record for a repair, inspection, or corrective task." triggerLabel="Create work order" submitLabel="Create work order" defaultOpen={defaultOpen} icon={Wrench} onSubmit={(data) => onCreate({ title: String(data.get("title")), description: String(data.get("description")), location: String(data.get("location")), category: category === "Other" ? String(data.get("customCategory")) : category, priority: String(data.get("priority")), assignee: String(data.get("assignee")), due: String(data.get("due")), requiresHousekeepingClearance: data.get("requiresHousekeepingClearance") === "on" })}>
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-5 text-sky-900"><strong>Work order:</strong> Maintenance’s internal job record. Requests sent by other departments remain under Service Requests.</div>
    <label className="block"><Label required>Work title</Label><input name="title" required className={inputClass} placeholder="Repair guest room air conditioner"/></label>
    <label className="block"><Label required>Problem and required work</Label><textarea name="description" required rows={3} className={textareaClass} placeholder="Describe the fault, checks already completed, and expected repair."/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Room or location</Label><input name="location" required className={inputClass} placeholder="Room 604 or East elevator"/></label><label><Label required>Category</Label><select name="category" required value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}><option value="" disabled>Select category</option><option>HVAC</option><option>Plumbing</option><option>Electrical</option><option>Equipment</option><option>Furniture and fixtures</option><option>Safety</option><option>Other</option></select></label></div>
    {category === "Other" && <label className="block"><Label required>Custom category</Label><input name="customCategory" required className={inputClass} placeholder="Enter a category used by your property"/></label>}
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Priority</Label><select name="priority" required defaultValue="Standard" className={inputClass}><option>Standard</option><option>High</option><option>Urgent</option></select></label><label><Label required>Assigned technician</Label><select name="assignee" required defaultValue="Unassigned" className={inputClass}><option>Unassigned</option><option>Jordan Lee</option><option>Sam Rivera</option></select></label></div>
    <label><Label>Due date and time</Label><input name="due" type="datetime-local" className={inputClass}/></label>
    <label className="flex min-h-11 items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><input name="requiresHousekeepingClearance" type="checkbox" className="mt-0.5 size-4 rounded border-amber-300 text-brand"/><span><strong className="block">Housekeeping is waiting for room clearance</strong><span className="mt-0.5 block text-xs leading-5 text-amber-800">When this work is completed and the room is released, the Housekeeping supervisor will be notified.</span></span></label>
  </DialogFrame>;
}

export type PreventiveMaintenanceDraft = { title: string; description: string; location: string; category: string; frequency: string; nextDue: string; assignee: string };
export function PreventiveMaintenanceDialog({ onCreate }: { onCreate: (draft: PreventiveMaintenanceDraft) => void }) {
  const [locationType, setLocationType] = useState("Guest room");
  const [category, setCategory] = useState("");
  return <DialogFrame title="Schedule preventive maintenance" description="Plan recurring inspections and upkeep for a guest room, amenity, public area, or hotel asset." triggerLabel="Schedule maintenance" submitLabel="Add schedule" icon={Wrench} onSubmit={(data) => onCreate({ title: String(data.get("title")), description: String(data.get("description")), location: locationType === "Guest room" ? `Room ${String(data.get("room"))}` : String(data.get("area")), category: category === "Other" ? String(data.get("customCategory")) : category, frequency: String(data.get("frequency")), nextDue: String(data.get("nextDue")), assignee: String(data.get("assignee")) })}>
    <label className="block"><Label required>Maintenance task</Label><input name="title" required className={inputClass} placeholder="Inspect fan-coil unit and replace filter"/></label>
    <label className="block"><Label required>Inspection or service checklist</Label><textarea name="description" required rows={3} className={textareaClass} placeholder="Describe the checks and routine work to complete."/></label>
    <label><Label required>Location type</Label><select value={locationType} onChange={(event) => setLocationType(event.target.value)} className={inputClass}><option>Guest room</option><option>Lobby</option><option>Pool area</option><option>Amenity</option><option>Public area</option><option>Equipment room</option><option>Other location</option></select></label>
    {locationType === "Guest room" ? <label className="block"><Label required>Room number</Label><input name="room" required inputMode="numeric" className={inputClass} placeholder="604"/></label> : <label className="block"><Label required>Area, amenity, or asset</Label><input name="area" required className={inputClass} defaultValue={locationType === "Other location" ? "" : locationType} placeholder="Fitness centre treadmill 2"/></label>}
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Category</Label><select required value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}><option value="" disabled>Select category</option><option>HVAC</option><option>Plumbing</option><option>Electrical</option><option>Pool systems</option><option>Life safety</option><option>Elevator</option><option>Equipment</option><option>Other</option></select></label><label><Label required>Frequency</Label><select name="frequency" required defaultValue="Monthly" className={inputClass}><option>Weekly</option><option>Monthly</option><option>Quarterly</option><option>Semi-annually</option><option>Annually</option></select></label></div>
    {category === "Other" && <label className="block"><Label required>Custom category</Label><input name="customCategory" required className={inputClass} placeholder="Enter a preventive maintenance category"/></label>}
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Next due date</Label><input name="nextDue" type="date" required className={inputClass}/></label><label><Label required>Assigned technician</Label><select name="assignee" required defaultValue="Unassigned" className={inputClass}><option>Unassigned</option><option>Jordan Lee</option><option>Noah Wilson</option><option>Sam Rivera</option></select></label></div>
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

export type ManagementIncidentDraft = { property: string; occurredAt: string; category: string; location: string; severity: string; department: string; owner: string; description: string; immediateAction: string; reportable: boolean };
export function ManagementIncidentDialog({ defaultOpen, onCreate }: { defaultOpen?: boolean; onCreate: (draft: ManagementIncidentDraft) => void }) {
  return <DialogFrame title="Record management incident" description="Create the property’s management record, assign ownership, and document the immediate response." triggerLabel="Record incident" submitLabel="Create incident" defaultOpen={defaultOpen} icon={ShieldAlert} onSubmit={(data) => onCreate({ property: String(data.get("property")), occurredAt: String(data.get("occurredAt")), category: String(data.get("category")), location: String(data.get("location")), severity: String(data.get("severity")), department: String(data.get("department")), owner: String(data.get("owner")), description: String(data.get("description")), immediateAction: String(data.get("immediateAction")), reportable: data.get("reportable") === "on" })}>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Property</Label><select name="property" required defaultValue="Ottawa Downtown" className={inputClass}><option>Ottawa Downtown</option><option>Ottawa Airport</option></select></label><label><Label required>Date and time occurred</Label><input name="occurredAt" type="datetime-local" required className={inputClass}/></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Incident category</Label><select name="category" required defaultValue="" className={inputClass}><option value="" disabled>Select category</option><option>Guest safety</option><option>Employee safety</option><option>Security</option><option>Property damage</option><option>Service disruption</option><option>Privacy or data</option><option>Other</option></select></label><label><Label required>Room or location</Label><input name="location" required className={inputClass} placeholder="Room 604 or Pool corridor"/></label></div>
    <label className="block"><Label required>Incident details</Label><textarea name="description" required rows={4} className={textareaClass} placeholder="Record the facts, people involved, and impact on guests or operations."/></label>
    <label className="block"><Label required>Immediate action taken</Label><textarea name="immediateAction" required rows={3} className={textareaClass} placeholder="Describe how the situation was contained and who was notified."/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Severity</Label><select name="severity" required defaultValue="Moderate" className={inputClass}><option>Low</option><option>Moderate</option><option>High</option><option>Critical</option></select></label><label><Label required>Responsible department</Label><select name="department" required defaultValue="Management" className={inputClass}><option>Management</option><option>Front Desk</option><option>Housekeeping</option><option>Maintenance</option><option>Security</option></select></label></div>
    <label><Label required>Follow-up owner</Label><input name="owner" required defaultValue="General Manager" className={inputClass}/></label>
    <label className="flex min-h-11 items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><input name="reportable" type="checkbox" className="mt-0.5 size-4 rounded border-amber-300 text-brand"/><span><strong className="block">External or regulatory reporting may be required</strong><span className="mt-0.5 block text-xs leading-5 text-amber-800">Flag this incident for management review of insurance, brand, police, health, or safety reporting obligations.</span></span></label>
  </DialogFrame>;
}

export type QualityScoreDraft = { property: string; department: string; score: number; target: number; reviewDate: string; reviewType: string; reviewer: string; comments: string; followUp: boolean };
export function QualityScoreDialog({ current, onCreate }: { current?: QualityScoreDraft; onCreate: (draft: QualityScoreDraft) => void }) {
  return <DialogFrame title={current ? `Update ${current.department} score` : "Add department quality review"} description={current ? `The current score is ${current.score}%. Update this same department record with the latest completed review.` : "Add a department that does not yet have a current quality score."} triggerLabel={current ? "Update score" : "Add quality score"} submitLabel={current ? "Update current score" : "Save initial score"} triggerVariant={current ? "secondary" : undefined} onSubmit={(data) => onCreate({ property: String(data.get("property")), department: String(data.get("department")), score: Number(data.get("score")), target: Number(data.get("target")), reviewDate: String(data.get("reviewDate")), reviewType: String(data.get("reviewType")), reviewer: String(data.get("reviewer")), comments: String(data.get("comments")), followUp: data.get("followUp") === "on" })}>
    {current && <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"><strong>Current score: {current.score}%</strong><span className="mt-1 block text-xs text-sky-800">Saving replaces the current score shown for this department.</span></div>}
    <div className="grid gap-4 sm:grid-cols-2">{current ? <><label><Label>Property</Label><input name="property" value={current.property} readOnly className={`${inputClass} bg-slate-50 text-slate-500`}/></label><label><Label>Department</Label><input name="department" value={current.department} readOnly className={`${inputClass} bg-slate-50 text-slate-500`}/></label></> : <><label><Label required>Property</Label><select name="property" required defaultValue="Ottawa Downtown" className={inputClass}><option>Ottawa Downtown</option><option>Ottawa Airport</option></select></label><label><Label required>Department</Label><select name="department" required defaultValue="" className={inputClass}><option value="" disabled>Select department</option><option>Front Desk</option><option>Housekeeping</option><option>Maintenance</option><option>Food & Beverage</option><option>Security</option></select></label></>}</div>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>{current ? "Updated score (%)" : "Initial score (%)"}</Label><input name="score" type="number" min="0" max="100" required defaultValue={current?.score} className={inputClass} placeholder="94"/></label><label><Label required>Target (%)</Label><input name="target" type="number" min="0" max="100" required defaultValue={current?.target ?? 90} className={inputClass}/></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Review date</Label><input name="reviewDate" type="date" required className={inputClass}/></label><label><Label required>Review type</Label><select name="reviewType" required defaultValue={current?.reviewType ?? "Quality inspection"} className={inputClass}><option>Quality inspection</option><option>Brand review</option><option>Internal audit</option><option>Guest experience review</option><option>Safety inspection</option></select></label></div>
    <label><Label required>Reviewed by</Label><input name="reviewer" required defaultValue={current?.reviewer ?? "General Manager"} className={inputClass}/></label>
    <label className="block"><Label>Comments and corrective actions</Label><textarea name="comments" rows={3} className={textareaClass} placeholder="Note findings, strengths, and required follow-up."/></label>
    <label className="flex min-h-11 items-center gap-3 text-sm text-slate-600"><input name="followUp" type="checkbox" defaultChecked={current?.followUp} className="size-4 rounded border-slate-300 text-brand"/>Corrective follow-up is required</label>
  </DialogFrame>;
}

export type PropertyDraft = { name: string; code: string; address: string; city: string; region: string; postalCode: string; timezone: string; rooms: number; status: string };
export function PropertyDialog({ onCreate }: { onCreate: (draft: PropertyDraft) => void | Promise<void> }) {
  return <DialogFrame title="Add property" description="Set up the hotel’s identity, location, operating timezone, and room inventory." triggerLabel="Add property" submitLabel="Create property" onSubmit={(data) => onCreate({ name: String(data.get("name")), code: String(data.get("code")).toUpperCase(), address: String(data.get("address")), city: String(data.get("city")), region: String(data.get("region")), postalCode: String(data.get("postalCode")), timezone: String(data.get("timezone")), rooms: Number(data.get("rooms")), status: String(data.get("status")) })}>
    <div className="grid gap-4 sm:grid-cols-[1fr_140px]"><label><Label required>Property name</Label><input name="name" required className={inputClass} placeholder="Ottawa West"/></label><label><Label required>Property code</Label><input name="code" required maxLength={12} className={inputClass} placeholder="OTT-WEST"/></label></div>
    <label className="block"><Label required>Street address</Label><input name="address" required autoComplete="street-address" className={inputClass} placeholder="100 Example Street"/></label>
    <div className="grid gap-4 sm:grid-cols-3"><label><Label required>City</Label><input name="city" required className={inputClass} placeholder="Ottawa"/></label><label><Label required>Province/state</Label><input name="region" required className={inputClass} placeholder="Ontario"/></label><label><Label required>Postal code</Label><input name="postalCode" required className={inputClass} placeholder="K1A 0B1"/></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label><Label required>Timezone</Label><select name="timezone" required defaultValue="America/Toronto" className={inputClass}><option>America/Toronto</option><option>America/Vancouver</option><option>America/Edmonton</option><option>America/Winnipeg</option><option>America/Halifax</option><option>America/St_Johns</option></select></label><label><Label required>Guest rooms</Label><input name="rooms" type="number" min="1" required className={inputClass} placeholder="142"/></label></div>
    <label><Label required>Opening status</Label><select name="status" required defaultValue="Active" className={inputClass}><option>Active</option><option>Pre-opening</option><option>Temporarily closed</option></select></label>
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
