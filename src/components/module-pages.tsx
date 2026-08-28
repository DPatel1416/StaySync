"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Archive, ArrowDown, ArrowDownToLine, ArrowUp, BellRing, CalendarDays, Check, ChevronDown, Download, FileText, Filter, Minus, MessageSquare, Paperclip, Pin, Plus, Printer, Search, Send, SlidersHorizontal, X } from "lucide-react";
import { latestLogs, serviceRequests } from "@/lib/demo-data";
import { workspaceNames } from "@/lib/demo-data";
import type { WorkspaceRole } from "@/lib/permissions";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardHeader } from "./ui/card";
import { ListRows, PageHeading } from "./dashboard/shared";
import { IncidentDialog, LateCheckoutDialog, LostFoundDialog, ManagementIncidentDialog, OperationLogDialog, PreventiveMaintenanceDialog, PropertyDialog, QualityScoreDialog, ServiceRequestDialog, WorkOrderDialog, type PreventiveMaintenanceDraft, type QualityScoreDraft, type WorkOrderDraft } from "./record-dialogs";
import { canModifyOperationLog, IncidentEditor, LostFoundEditor, OperationLogEditor, ServiceRequestEditor, WorkOrderEditor, type EditableLog, type EditableOperationalRecord, type EditableRequest } from "./record-update-dialogs";
import { addRoomUpdate, isInformationalRoomChange, markRoomClearedByMaintenance, updateRoomUpdateState, useRoomUpdates } from "@/lib/room-update-store";
import { addServiceRequest, deleteServiceRequest, updateServiceRequest, useServiceRequests } from "@/lib/service-request-store";
import { sendDepartmentReminder } from "@/lib/notification-store";
import { assignHousekeepingRooms, housekeepingEmployees, parseRoomNumbers, releaseRoomToHousekeeping, updateHousekeepingRoom, useHousekeepingRooms, type HousekeepingRoomAssignment } from "@/lib/housekeeping-room-store";
import { demoEmployees, getDemoEmployeeSession, getSavedDemoEmployeeUsername, saveDemoEmployeeSession, type DemoEmployee } from "@/lib/demo-auth";
import { addWorkOrder, maintenanceEmployees, updateWorkOrder, useWorkOrders, type WorkOrder } from "@/lib/work-order-store";
import { addUserAccount, deleteUserAccount, departmentLabels, departmentTitles, updateUserAccount, useUserAccounts, type UserAccount } from "@/lib/user-account-store";
import { addDepartment, getDepartmentLabel, getDepartmentTitles, useDepartments } from "@/lib/department-store";
import { addIncident, deleteIncident, updateIncident, useIncidents, type IncidentRecord } from "@/lib/incident-store";

const moduleTitles: Record<string, [string, string]> = {
  incidents: ["Incidents", "Document, review, and resolve operational incidents."],
  "lost-found": ["Lost & Found", "Track found items from storage through final disposition."],
  "payment-issues": ["Payment discrepancies", "Resolve operational payment issues without duplicating billing."],
  "assigned-rooms": ["Assigned rooms", "Today’s room assignments and service priorities."],
  preventive: ["Preventive maintenance", "Scheduled inspections and recurring upkeep."],
  people: ["People & access", "Manage employees, roles, property access, and temporary passwords."],
  properties: ["Properties", "Manage organization properties and operational settings."],
  settings: ["Workspace settings", "Manage your preferences and department defaults."],
};

export function ModulePage({ role, module, create = false, requestId }: { role: WorkspaceRole; module: string; create?: boolean; requestId?: string }) {
  if (module === "operations-log") return <OperationsLog role={role} autoOpen={create}/>;
  if (module === "service-requests") return <ServiceRequests role={role} autoOpen={create} initialRequestId={requestId}/>;
  if (module === "incidents" && role !== "manager") return <IncidentsPage role={role} autoOpen={create}/>;
  if (module === "incidents" && role === "manager") return <ManagementIncidentsPage autoOpen={create}/>;
  if (module === "lost-found" && role === "front-desk") return <LostFoundPage autoOpen={create}/>;
  if (module === "room-updates") return <RoomStatus role={role} autoOpen={create}/>;
  if (module === "assigned-rooms" && role === "housekeeping") return <AssignedRooms/>;
  if (module === "work-orders") return <WorkOrders autoOpen={create} initialWorkOrderId={requestId}/>;
  if (module === "preventive") return <PreventiveMaintenance/>;
  if (module === "maintenance-reports") return <MaintenanceReports/>;
  if (module === "quality-scores") return <QualityScores/>;
  if (module === "properties" && role === "manager") return <PropertiesPage/>;
  if (module === "reports") return <Reports/>;
  if (module === "people" && role === "manager") return <PeoplePage/>;
  if (module === "settings") return <AccountSettings role={role}/>;
  const [title, description] = moduleTitles[module] ?? [module.replaceAll("-", " "), "Operational records for this workspace."];
  return <GenericPage title={title} description={description} module={module}/>;
}

function Toolbar({ placeholder, action }: { placeholder: string; action?: React.ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row"><label className="relative min-w-0 flex-1"><span className="sr-only">Search</span><Search className="absolute left-3.5 top-3.5 size-4 text-slate-400"/><input type="search" placeholder={placeholder} className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand"/></label><Button variant="secondary"><Filter className="size-4"/>Filters</Button>{action}</div>;
}

function OperationsLog({ role, autoOpen = false }: { role: WorkspaceRole; autoOpen?: boolean }) {
  const accounts = useUserAccounts();
  const departments = useDepartments();
  const defaultEmployee = useMemo(() => role === "front-desk" ? demoEmployees["alex.morgan"] : role === "housekeeping" ? demoEmployees["sofia.martin"] : role === "maintenance" ? demoEmployees["sam.rivera"] : role === "food-beverage" ? demoEmployees["olivia.bennett"] : role === "manager" ? demoEmployees["maya.chen"] : accounts.find((account) => account.workspace === role) ?? { name: "Department team member", isSupervisor: false, title: "Team Member" }, [accounts, role]);
  const [currentEmployee, setCurrentEmployee] = useState(defaultEmployee);
  const [logs, setLogs] = useState<EditableLog[]>(latestLogs);
  const [selectedLog, setSelectedLog] = useState<EditableLog | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState("All departments");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, Array<{ id: string; author: string; message: string; time: string }>>>({});
  const [logAttachments, setLogAttachments] = useState<Record<string, Array<{ id: string; name: string; size: string }>>>({});
  const [modificationClock, setModificationClock] = useState(() => Date.now());
  useEffect(() => setCurrentEmployee(getDemoEmployeeSession(role) ?? defaultEmployee), [defaultEmployee, role]);
  const currentDepartment = getDepartmentLabel(role, departments);
  const currentUserName = currentEmployee.name;
  useEffect(() => {
    const expirations = logs.filter((log) => log.author === currentUserName && log.createdAt).map((log) => log.createdAt! + 15 * 60 * 1000 - Date.now()).filter((remaining) => remaining >= 0);
    if (!expirations.length) return;
    const timer = window.setTimeout(() => setModificationClock(Date.now()), Math.min(...expirations) + 25);
    return () => window.clearTimeout(timer);
  }, [currentUserName, logs, modificationClock]);
  const visibleLogs = role === "manager"
    ? departmentFilter === "All departments" ? logs : logs.filter((log) => log.department === departmentFilter || log.sharedWith?.includes(departmentFilter))
    : logs.filter((log) => log.department === currentDepartment || log.sharedWith?.includes(currentDepartment));
  function addReply(logId: string, message: string) {
    const next = { id: `reply-${Date.now()}`, author: currentUserName, message, time: "Just now" };
    setReplies((current) => ({ ...current, [logId]: [...(current[logId] ?? []), next] }));
    setReplyingTo(null);
  }
  function addAttachment(logId: string, file: File) {
    const size = file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    setLogAttachments((current) => ({ ...current, [logId]: [...(current[logId] ?? []), { id: `file-${Date.now()}`, name: file.name, size }] }));
  }
  return <div className="space-y-6"><PageHeading eyebrow={currentDepartment} title="Operations Log" description={role === "manager" ? "Review and filter department conversations across Ottawa Downtown." : `Internal ${currentDepartment} updates, plus entries shared with your department.`} actions={<OperationLogDialog defaultOpen={autoOpen} onCreate={(draft) => setLogs([{ id: `log-${Date.now()}`, author: currentUserName, department: currentDepartment, sharedWith: draft.sharedWith ? [draft.sharedWith] : [], time: "Just now", message: draft.message, priority: draft.priority, pinned: false, createdAt: Date.now() }, ...logs])}/>}/>
    <Toolbar placeholder="Search messages, rooms, or authors…" action={<div className="flex flex-wrap gap-2">{role === "manager" && <label><span className="sr-only">Filter Operations Log by department</span><select aria-label="Filter Operations Log by department" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm"><option>All departments</option><option>Management</option>{departments.map((department) => <option key={department.workspace}>{department.name}</option>)}</select></label>}<Button variant="secondary"><CalendarDays className="size-4"/>Date range</Button></div>}/>
    <Card><div className="divide-y divide-slate-100">{visibleLogs.map((log) => { const canModify = canModifyOperationLog(log, currentUserName, modificationClock); return <article key={log.id} className="px-5 py-5 sm:px-6"><div className="flex gap-3"><span className={`mt-1 size-2.5 shrink-0 rounded-full ${log.priority === "Urgent" ? "bg-rose-500" : log.priority === "Important" ? "bg-amber-500" : "bg-sky-500"}`}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900">{log.author}</p><span className="text-xs text-slate-400">{log.department} · {log.time}</span>{log.sharedWith?.length ? <Badge tone="brand">Shared with {log.sharedWith.join(", ")}</Badge> : <Badge tone="neutral">Department only</Badge>}{log.pinned && <Badge tone="warning"><Pin className="mr-1 size-3"/>Pinned</Badge>}<Badge tone={log.priority === "Urgent" ? "urgent" : log.priority === "Important" ? "warning" : "info"}>{log.priority}</Badge>{canModify && <button onClick={() => setSelectedLog(log)} className="ml-auto min-h-9 rounded-lg px-2.5 text-xs font-semibold text-brand hover:bg-brand-soft">Edit entry</button>}</div><p className="mt-2 text-[15px] leading-6 text-slate-600">{log.message}</p>{(replies[log.id]?.length || logAttachments[log.id]?.length) ? <div className="mt-4 space-y-2 border-l-2 border-brand-muted pl-4">{replies[log.id]?.map((reply) => <div key={reply.id} className="rounded-xl bg-slate-50 px-3 py-2.5"><div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-800">{reply.author}</span><span className="text-[11px] text-slate-400">{reply.time}</span></div><p className="mt-1 text-sm text-slate-600">{reply.message}</p></div>)}{logAttachments[log.id]?.map((file) => <div key={file.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"><span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand"><FileText className="size-4"/></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{file.name}</p><p className="text-[11px] text-slate-400">{file.size} · Added by {currentUserName}</p></div></div>)}</div> : null}{replyingTo === log.id && <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); addReply(log.id, String(form.get("reply"))); }}><label className="min-w-0 flex-1"><span className="sr-only">Reply message</span><input name="reply" required autoFocus className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand" placeholder="Write a reply to this update…"/></label><Button type="submit" size="sm"><Send className="size-3.5"/>Send reply</Button><Button type="button" size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>Cancel</Button></form>}<div className="mt-3 flex flex-wrap gap-4"><button onClick={() => setReplyingTo(replyingTo === log.id ? null : log.id)} className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand"><MessageSquare className="size-3.5"/>Reply{replies[log.id]?.length ? ` (${replies[log.id].length})` : ""}</button>{canModify && <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand"><Paperclip className="size-3.5"/>Attachment{logAttachments[log.id]?.length ? ` (${logAttachments[log.id].length})` : ""}<input type="file" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) addAttachment(log.id, file); event.currentTarget.value = ""; }}/></label>}</div></div></div></article>; })}</div></Card><OperationLogEditor log={selectedLog} currentUserName={currentUserName} onClose={() => setSelectedLog(null)} onSave={(updated) => setLogs(logs.map((log) => log.id === updated.id && canModifyOperationLog(log, currentUserName) ? updated : log))} onDelete={(deleted) => setLogs(logs.filter((log) => log.id !== deleted.id || !canModifyOperationLog(log, currentUserName)))}/></div>;
}

function ServiceRequests({ role, autoOpen = false, initialRequestId }: { role: WorkspaceRole; autoOpen?: boolean; initialRequestId?: string }) {
  const requests = useServiceRequests();
  const defaultDepartmentEmployee = role === "housekeeping" ? demoEmployees["sofia.martin"] : role === "maintenance" ? demoEmployees["sam.rivera"] : null;
  const [currentEmployee, setCurrentEmployee] = useState(defaultDepartmentEmployee);
  useEffect(() => { if (role === "housekeeping" || role === "maintenance") setCurrentEmployee(getDemoEmployeeSession(role) ?? (role === "housekeeping" ? demoEmployees["sofia.martin"] : demoEmployees["sam.rivera"])); }, [role]);
  const isHousekeepingSupervisor = role === "housekeeping" && Boolean(currentEmployee?.isSupervisor);
  const isMaintenanceSupervisor = role === "maintenance" && Boolean(currentEmployee?.isSupervisor);
  const visibleRequests = role === "maintenance" ? requests.filter((request) => request.assigned === "Maintenance" && (isMaintenanceSupervisor || request.assignedUser === currentEmployee?.name)) : role !== "housekeeping" ? requests : requests.filter((request) => request.assigned === "Housekeeping" && (isHousekeepingSupervisor || request.assignedUser === currentEmployee?.name));
  const [selectedRequest, setSelectedRequest] = useState<EditableRequest | null>(() => visibleRequests.find((request) => request.id === initialRequestId) ?? null);
  const [lastReminder, setLastReminder] = useState<{ requestId: string; department: string } | null>(null);
  const [lastSavedRequest, setLastSavedRequest] = useState<EditableRequest | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const canCreate = role !== "maintenance" || true;
  const datedRequests = visibleRequests.filter((request) => request.createdAt ? new Date(request.createdAt).toISOString().slice(0, 10) === selectedDate : selectedDate === today);
  const completedRequests = datedRequests.filter((request) => request.status === "Completed" || request.status === "Cancelled");
  const activeRequests = datedRequests.filter((request) => request.status !== "Completed" && request.status !== "Cancelled");
  const reportedIssues = isHousekeepingSupervisor ? activeRequests.filter((request) => request.from === "Housekeeping") : [];
  const primaryRequests = isHousekeepingSupervisor ? activeRequests.filter((request) => request.from !== "Housekeeping") : activeRequests;
  function createRequest(draft: { title: string; location: string; department: string; priority: string; due: string }) {
    const request = { id: `SR-${1050 + requests.length}`, title: draft.title, location: draft.location, from: workspaceNames[role], assigned: draft.department, assignedUser: draft.department === "Housekeeping" || draft.department === "Maintenance" ? "Unassigned" : undefined, priority: draft.priority, status: "Open", due: draft.due ? "Scheduled" : "Today", createdAt: Date.now(), createdBy: role === "front-desk" ? "Alex Morgan" : currentEmployee?.name ?? "You" };
    addServiceRequest(request);
    if (draft.department === "Housekeeping") sendDepartmentReminder({ department: "Housekeeping", title: `New service request: ${request.id}`, message: `${request.title} at ${request.location} is waiting for supervisor assignment.`, serviceRequestId: request.id, createdBy: request.createdBy, audience: "SUPERVISORS", tone: request.priority === "Urgent" ? "urgent" : "info", kind: "SERVICE_REQUEST" });
    if (draft.department === "Maintenance") sendDepartmentReminder({ department: "Maintenance", title: `New service request: ${request.id}`, message: `${request.title} at ${request.location} is waiting for supervisor assignment.`, serviceRequestId: request.id, createdBy: request.createdBy, audience: "SUPERVISORS", tone: request.priority === "Urgent" ? "urgent" : "info", kind: "SERVICE_REQUEST" });
  }
  function remind(request: EditableRequest) {
    sendDepartmentReminder({
      department: request.assigned,
      title: `Reminder: ${request.id}`,
      message: `${request.title} at ${request.location} still requires attention.`,
      serviceRequestId: request.id,
      createdBy: "Alex Morgan",
      audience: request.assigned === "Housekeeping" ? "SUPERVISORS" : "DEPARTMENT",
      kind: "REMINDER",
    });
    setLastReminder({ requestId: request.id, department: request.assigned });
  }
  return <div className="space-y-6">
    <PageHeading eyebrow={workspaceNames[role]} title="Service Requests" description={role === "maintenance" ? "Requests sent to Maintenance by other departments. Create or track internal repair jobs under Work Orders." : role === "housekeeping" ? isHousekeepingSupervisor ? "Review incoming department requests separately from issues reported by your team." : "Requests assigned specifically to you." : "Coordinate operational requests from creation through completion."} actions={canCreate ? <ServiceRequestDialog defaultOpen={autoOpen} onCreate={createRequest}/> : undefined}/>
    <Toolbar placeholder="Search requests, rooms, or locations…" action={<label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600"><CalendarDays className="size-4"/><span className="sr-only">Request date</span><input aria-label="Request date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="bg-transparent text-sm outline-none"/></label>}/>
    <p className="sr-only" role="status" aria-live="polite">{lastReminder ? `Reminder sent to ${lastReminder.department} for ${lastReminder.requestId}.` : ""}</p>
    {lastSavedRequest && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><Check className="size-4"/>{isHousekeepingSupervisor || isMaintenanceSupervisor ? `${lastSavedRequest.id} assigned to ${lastSavedRequest.assignedUser ?? lastSavedRequest.assigned}. The request is now visible in their queue.` : `${lastSavedRequest.id} updated to ${lastSavedRequest.status}.`}</div>}
    {isHousekeepingSupervisor && <Card id="reported-room-issues" className="overflow-hidden"><CardHeader title="Employee-reported room issues" description="Room issues submitted by Housekeeping attendants for follow-up"/><div className="divide-y divide-slate-100">{reportedIssues.map((request) => <button key={request.id} onClick={() => setSelectedRequest(request)} className="flex min-h-[72px] w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 sm:px-6"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-sm font-bold text-amber-800">{request.location.replace("Room ", "")}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{request.title}</span><span className="mt-1 block text-xs text-slate-500">Reported by {request.createdBy ?? "Housekeeping employee"}</span></span><Badge tone={request.priority === "Urgent" ? "urgent" : "warning"}>{request.assignedUser === "Unassigned" ? "Needs assignment" : request.status}</Badge></button>)}{reportedIssues.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">No employee-reported issues for this date.</p>}</div></Card>}
    <Card className="overflow-hidden"><CardHeader title={isHousekeepingSupervisor ? "Department service requests" : "Active service requests"} description={isHousekeepingSupervisor ? "Requests sent to Housekeeping by Front Desk and other departments" : `Open work for ${selectedDate}`}/>
      <div className="hidden grid-cols-[120px_1fr_150px_140px_130px_110px_48px] gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:grid"><span>Request</span><span>Details</span><span>Assigned to</span><span>Priority</span><span>Status</span><span>Due</span>{role === "front-desk" && <span className="text-center">Notify</span>}</div>
      <div className="divide-y divide-slate-100">{primaryRequests.map((request) => {
        const canRemind = role === "front-desk" && request.status !== "Completed" && request.status !== "Cancelled";
        const sent = lastReminder?.requestId === request.id;
        return <article key={request.id} className="relative pr-16 lg:grid lg:grid-cols-[1fr_48px] lg:items-center lg:pr-0">
          <button onClick={() => setSelectedRequest(request)} aria-label={`Open ${request.id}, ${request.title}`} className="grid w-full gap-3 px-5 py-4 text-left hover:bg-slate-50 sm:px-6 lg:grid-cols-[120px_1fr_150px_140px_130px_110px] lg:items-center lg:gap-4">
            <span className="text-sm font-semibold text-brand">{request.id}</span><span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{request.title}</span><span className="mt-1 block text-xs text-slate-500">{request.location} · from {request.from}</span></span><span className="text-sm text-slate-600"><span className="mr-1 text-xs text-slate-400 lg:hidden">Assigned:</span>{request.assigned}{request.assignedUser && <span className="mt-0.5 block text-xs font-medium text-slate-400">{request.assignedUser}</span>}</span><span><Badge tone={request.priority === "Urgent" ? "urgent" : request.priority === "High" ? "warning" : "neutral"}>{request.priority}</Badge></span><span><Badge tone={request.status === "Completed" ? "success" : request.status === "In Progress" ? "info" : "brand"}>{request.status}</Badge></span><span className={request.due === "Overdue" ? "text-sm font-semibold text-rose-600" : "text-sm text-slate-500"}>{request.due}</span>
          </button>
          {canRemind && <button type="button" onClick={() => remind(request)} aria-label={`Notify ${request.assigned} again about ${request.id}`} title={`Notify ${request.assigned} again`} className={`absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl border transition lg:static lg:translate-y-0 ${sent ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500 hover:border-brand-border hover:bg-brand-soft hover:text-brand-strong"}`}>{sent ? <Check className="size-4"/> : <BellRing className="size-4"/>}</button>}
        </article>;
      })}{primaryRequests.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No active service requests for this date.</p>}</div>
    </Card>
    <Card className="overflow-hidden"><CardHeader title="Completed" description={`Completed and cancelled requests for ${selectedDate}`}/>{completedRequests.length ? <ListRows rows={completedRequests.map((request) => ({ title: `${request.id} · ${request.title}`, detail: `${request.location} · ${request.assignedUser ?? request.assigned}`, badge: request.status, tone: request.status === "Completed" ? "success" : "neutral", href: `/app/${role}/service-requests?request=${request.id}` }))}/> : <p className="px-5 py-8 text-center text-sm text-slate-500">No completed requests for this date.</p>}</Card>
    {lastReminder && <div role="alert" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><Check className="size-4"/>Reminder sent to {lastReminder.department} for {lastReminder.requestId}.</div>}
    <ServiceRequestEditor request={selectedRequest} currentDepartment={workspaceNames[role]} currentUserName={currentEmployee?.name} isDepartmentSupervisor={isHousekeepingSupervisor || isMaintenanceSupervisor} assigneeOptions={role === "maintenance" ? maintenanceEmployees : housekeepingEmployees} onClose={() => setSelectedRequest(null)} onSave={(updated) => { updateServiceRequest(updated); setLastSavedRequest(updated); }} onDelete={(deleted) => deleteServiceRequest(deleted.id)}/>
  </div>;
}

function RoomStatus({ role, autoOpen = false }: { role: WorkspaceRole; autoOpen?: boolean }) {
  const updates = useRoomUpdates();
  const assignments = useHousekeepingRooms();
  const [housekeepingEmployee, setHousekeepingEmployee] = useState<DemoEmployee | null>(null);
  useEffect(() => { if (role === "housekeeping") setHousekeepingEmployee(getDemoEmployeeSession("housekeeping") ?? demoEmployees["sofia.martin"]); }, [role]);
  const frontDesk = role === "front-desk";
  const visibleUpdates = role === "housekeeping" && housekeepingEmployee && !housekeepingEmployee.isSupervisor ? updates.filter((update) => assignments.some((assignment) => assignment.room === update.room && assignment.assignedTo === housekeepingEmployee.name)) : updates;
  function displayTime(value: string) { const [hours, minutes] = value.split(":").map(Number); const suffix = hours >= 12 ? "PM" : "AM"; return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`; }
  function expiresAtSix(date: string) { return new Date(`${date}T18:00:00`).getTime(); }
  return <div className="space-y-6"><PageHeading eyebrow={frontDesk ? "Front Desk" : "Housekeeping"} title="Room status updates" description={frontDesk ? "Share checkout changes that affect Housekeeping assignments." : housekeepingEmployee && !housekeepingEmployee.isSupervisor ? "Information and operational changes for rooms assigned to you." : "Operational changes from Front Desk that affect room assignments and service type."} actions={frontDesk ? <LateCheckoutDialog defaultOpen={autoOpen} onCreate={(draft) => addRoomUpdate({ id: `room-update-${Date.now()}`, room: draft.room, type: "Late checkout", detail: `Checkout changed from ${displayTime(draft.originalTime)} to ${displayTime(draft.newTime)}.${draft.note ? ` ${draft.note}` : ""}`, time: "Just now", state: "Information only", expiresAt: expiresAtSix(draft.date), createdBy: "Alex Morgan" })}/> : housekeepingEmployee?.isSupervisor ? <EntryDialog title="Update room status" submitLabel="Share update" fields={["Room number", "Change type", "Operational details"]}/> : undefined}/><Toolbar placeholder="Search room number or update type…"/><Card><div className="divide-y divide-slate-100">{visibleUpdates.map((u, index) => { const fallbackKey = `${u.room}-${u.type}`; const informationOnly = isInformationalRoomChange(u); return <article key={u.id ?? `${fallbackKey}-${index}`} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-soft font-bold text-brand-strong">{u.room}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{u.type}</p>{(frontDesk || informationOnly) && <Badge tone="info">{informationOnly ? "Information only" : u.state}</Badge>}</div><p className="mt-1.5 text-sm text-slate-500">{u.detail}</p><p className="mt-2 text-xs text-slate-400">Updated by {u.createdBy ?? "Alex Morgan"} · {u.time}{informationOnly ? " · Removed automatically at 6:00 PM" : ""}</p></div>{!frontDesk && !informationOnly && housekeepingEmployee?.isSupervisor && <label className="min-w-44"><span className="mb-1 block text-xs font-semibold text-slate-500">Housekeeping status</span><select aria-label={`Housekeeping status for room ${u.room}`} value={u.state} onChange={(event) => updateRoomUpdateState(u.id, fallbackKey, event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-brand"><option>Housekeeping notified</option><option>Action needed</option><option>Assignment changed</option><option>Ready to assign</option><option>Waiting for clearance</option><option>Acknowledged</option><option>In Progress</option><option>Completed</option></select></label>}</article>; })}{visibleUpdates.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No room changes apply to your assigned rooms.</p>}</div></Card></div>;
}

function AssignedRooms() {
  const assignments = useHousekeepingRooms();
  const [currentEmployee, setCurrentEmployee] = useState(demoEmployees["sofia.martin"]);
  const [assignmentMessage, setAssignmentMessage] = useState("");
  useEffect(() => setCurrentEmployee(getDemoEmployeeSession("housekeeping") ?? demoEmployees["sofia.martin"]), []);
  const hasSupervisorAccess = Boolean(currentEmployee.isSupervisor);
  const visibleAssignments = hasSupervisorAccess ? assignments : assignments.filter((assignment) => assignment.assignedTo === currentEmployee.name);
  const employeeGroups = (hasSupervisorAccess ? housekeepingEmployees : [currentEmployee.name]).map((employee) => ({ employee, rooms: visibleAssignments.filter((assignment) => assignment.assignedTo === employee) })).filter((group) => group.rooms.length > 0 || (hasSupervisorAccess && group.employee !== "Unassigned"));

  function assignRooms(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rooms = parseRoomNumbers(String(data.get("rooms")));
    if (!rooms.length) { setAssignmentMessage("Enter at least one valid room number."); return; }
    assignHousekeepingRooms(rooms, String(data.get("employee")), String(data.get("service")) as "Departure clean" | "Stayover service" | "Refresh service", String(data.get("priority")) as "Standard" | "Priority");
    setAssignmentMessage(`${rooms.length} ${rooms.length === 1 ? "room" : "rooms"} assigned successfully.`);
    event.currentTarget.reset();
  }

  return <div className="space-y-6"><PageHeading eyebrow="Housekeeping" title={hasSupervisorAccess ? "Daily room assignment board" : "My rooms today"} description={hasSupervisorAccess ? "Assign several rooms to one employee in a single step, then monitor today’s cleaning workload." : `Rooms assigned to ${currentEmployee.name} for today.`}/>{hasSupervisorAccess ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3"><div><p className="text-sm font-semibold text-teal-900">Ottawa Downtown · 142 guest rooms</p><p className="mt-0.5 text-xs text-teal-800">{assignments.length} rooms currently placed on today’s Housekeeping board.</p></div><Badge tone="success">Supervisor assignment access</Badge></div> : <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"><div><p className="text-sm font-semibold text-slate-900">{visibleAssignments.length} {visibleAssignments.length === 1 ? "room" : "rooms"} assigned to you today</p><p className="mt-0.5 text-xs text-slate-500">Your board includes only rooms assigned directly to you.</p></div><Badge tone="info">Personal assignment view</Badge></div>}
    {hasSupervisorAccess && <Card className="p-5 sm:p-6"><div><h2 className="text-base font-semibold text-slate-900">Quick room assignment</h2><p className="mt-1 text-sm text-slate-500">Enter individual rooms or ranges, such as 201-208, 214, 219.</p></div><form onSubmit={assignRooms} className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_140px_auto] lg:items-end"><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Rooms</span><input name="rooms" required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand" placeholder="201-208, 214, 219"/></label><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Assign to</span><select name="employee" required defaultValue="Priya Shah" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{housekeepingEmployees.filter((employee) => employee !== "Unassigned").map((employee) => <option key={employee}>{employee}</option>)}</select></label><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Service</span><select name="service" defaultValue="Departure clean" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option>Departure clean</option><option>Stayover service</option><option>Refresh service</option></select></label><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Priority</span><select name="priority" defaultValue="Standard" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option>Standard</option><option>Priority</option></select></label><Button type="submit">Assign rooms</Button></form>{assignmentMessage && <p role="status" className={`mt-3 text-sm font-medium ${assignmentMessage.includes("successfully") ? "text-emerald-700" : "text-rose-700"}`}>{assignmentMessage}</p>}</Card>}
    <div className="grid gap-5 xl:grid-cols-2">{employeeGroups.map((group) => <Card key={group.employee} className="overflow-hidden"><CardHeader title={group.employee} description={`${group.rooms.length} ${group.rooms.length === 1 ? "room" : "rooms"} assigned today`}/>{group.rooms.length ? <div className="divide-y divide-slate-100">{group.rooms.map((assignment) => <article key={assignment.room} className="grid gap-3 px-5 py-4 sm:grid-cols-[64px_1fr_180px] sm:items-center sm:px-6"><span className="grid size-11 place-items-center rounded-xl bg-brand-soft font-bold text-brand-strong">{assignment.room}</span><span><span className="block text-sm font-semibold text-slate-800">{assignment.service}</span><span className="mt-1 flex items-center gap-2 text-xs text-slate-500"><Badge tone={assignment.priority === "Priority" ? "warning" : "neutral"}>{assignment.priority}</Badge>{hasSupervisorAccess && assignment.assignedTo !== "Unassigned" ? `Assigned to ${assignment.assignedTo}` : ""}</span></span><div className="space-y-2">{hasSupervisorAccess && <label><span className="sr-only">Assigned employee for room {assignment.room}</span><select aria-label={`Assigned employee for room ${assignment.room}`} value={assignment.assignedTo} onChange={(event) => event.target.value === "Unassigned" ? updateHousekeepingRoom(assignment.room, { assignedTo: "Unassigned" }) : assignHousekeepingRooms([assignment.room], event.target.value, assignment.service, assignment.priority)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700">{housekeepingEmployees.map((employee) => <option key={employee}>{employee}</option>)}</select></label>}<RoomCleaningControl assignment={assignment} supervisor={hasSupervisorAccess}/></div></article>)}</div> : <p className="px-5 py-8 text-center text-sm text-slate-500">No rooms assigned yet.</p>}</Card>)}</div>{visibleAssignments.length === 0 && !hasSupervisorAccess && <Card className="p-10 text-center"><p className="font-semibold text-slate-900">No rooms assigned yet</p><p className="mt-1 text-sm text-slate-500">Your supervisor’s assignments will appear here.</p></Card>}</div>;
}

function RoomCleaningControl({ assignment, supervisor }: { assignment: HousekeepingRoomAssignment; supervisor: boolean }) {
  const tone = assignment.status === "Ready to inspect" || assignment.status === "Inspected" ? "success" : assignment.status === "Waiting" ? "urgent" : "warning";
  return <div className="space-y-2"><Badge tone={tone}>{assignment.status}</Badge>{supervisor ? assignment.status === "Ready to inspect" ? <Button size="sm" className="w-full" onClick={() => updateHousekeepingRoom(assignment.room, { status: "Inspected" })}>Mark inspected</Button> : <p className="text-xs leading-4 text-slate-500">{assignment.status === "Inspected" ? "Inspection completed" : assignment.status === "Ready to assign" ? "Select an attendant above" : assignment.status === "Waiting" ? "Awaiting Maintenance clearance" : "Updated by assigned employee"}</p> : assignment.status === "Assigned" ? <Button size="sm" className="w-full border border-amber-300 bg-amber-50 text-amber-900 shadow-none hover:bg-amber-100" onClick={() => updateHousekeepingRoom(assignment.room, { status: "In Progress" })}>Start cleaning</Button> : assignment.status === "In Progress" ? <Button size="sm" className="w-full bg-slate-800 text-white hover:bg-slate-900" onClick={() => updateHousekeepingRoom(assignment.room, { status: "Ready to inspect" })}>Ready for inspection</Button> : <p className="text-xs leading-4 text-slate-500">{assignment.status === "Ready to inspect" ? "Waiting for supervisor inspection" : assignment.status === "Waiting" ? "Waiting for Maintenance clearance" : "Room inspected"}</p>}</div>;
}

function WorkOrders({ autoOpen = false, initialWorkOrderId }: { autoOpen?: boolean; initialWorkOrderId?: string }) {
  const allWorkOrders = useWorkOrders();
  const [employee, setEmployee] = useState<DemoEmployee>(demoEmployees["sam.rivera"]);
  useEffect(() => setEmployee(getDemoEmployeeSession("maintenance") ?? demoEmployees["sam.rivera"]), []);
  const isSupervisor = Boolean(employee.isSupervisor);
  const workOrders = allWorkOrders.filter((order) => order.type !== "Preventive" && (isSupervisor || order.assignee === employee.name));
  const [selected, setSelected] = useState<WorkOrder | null>(() => allWorkOrders.find((order) => order.id === initialWorkOrderId) ?? null);
  useEffect(() => { if (!isSupervisor && selected?.assignee !== employee.name) setSelected(null); }, [employee.name, isSupervisor, selected]);
  const [message, setMessage] = useState("");
  function createWorkOrder(draft: WorkOrderDraft) {
    addWorkOrder({ id: `WO-${285 + allWorkOrders.length}`, ...draft, type: "Corrective", status: draft.assignee === "Unassigned" ? "Open" : "Assigned", createdAt: Date.now(), createdBy: employee.name, age: "Just now" });
    setMessage("Work order created for Maintenance.");
  }
  function saveWorkOrder(updated: WorkOrder, releaseRequested: boolean) {
    updateWorkOrder(updated);
    const room = updated.location.match(/^Room\s+(\d+)/i)?.[1];
    if (releaseRequested && updated.status === "Completed" && room) {
      markRoomClearedByMaintenance(room, employee.name);
      releaseRoomToHousekeeping(room);
      sendDepartmentReminder({ department: "Housekeeping", title: `Room ${room} cleared by Maintenance`, message: `${updated.id} is complete. Room ${room} is safe to enter and ready for the supervisor to assign for cleaning.`, serviceRequestId: updated.id, href: "/app/housekeeping/assigned-rooms", createdBy: employee.name, audience: "SUPERVISORS", tone: "info", kind: "ROOM_CLEARANCE" });
      setMessage(`Room ${room} released. The Housekeeping supervisor has been notified.`);
    } else if (releaseRequested) {
      setMessage("Set the work order to Completed before releasing the room to Housekeeping.");
    } else {
      setMessage(`${updated.id} updated to ${updated.status}.`);
    }
  }
  const active = workOrders.filter((order) => order.status !== "Completed" && order.status !== "Cancelled");
  const completed = workOrders.filter((order) => order.status === "Completed" || order.status === "Cancelled");
  const rows = (orders: WorkOrder[]) => orders.map((order) => <button type="button" key={order.id} onClick={() => setSelected(order)} className="grid w-full gap-3 px-5 py-5 text-left hover:bg-slate-50 sm:px-6 md:grid-cols-[120px_1fr_130px_140px] md:items-center"><span className="text-sm font-semibold text-brand">{order.id}</span><span><span className="block text-sm font-semibold text-slate-900">{order.title}</span><span className="mt-1 block text-xs text-slate-500">{order.location} · {order.assignee}</span></span><Badge tone={order.priority === "Urgent" ? "urgent" : order.priority === "High" ? "warning" : "neutral"}>{order.priority}</Badge><Badge tone={order.status === "Completed" ? "success" : order.status === "In Progress" ? "info" : order.status === "Waiting" ? "warning" : "brand"}>{order.status}</Badge></button>);
  return <div className="space-y-6"><PageHeading eyebrow="Maintenance" title={isSupervisor ? "Work Orders" : "My Work Orders"} description={isSupervisor ? "Assign and monitor Maintenance-owned repair and inspection records." : `Corrective work assigned to ${employee.name}.`} actions={isSupervisor ? <WorkOrderDialog defaultOpen={autoOpen} onCreate={createWorkOrder}/> : undefined}/>{message && <p role="status" className={`rounded-xl border px-4 py-3 text-sm font-semibold ${message.startsWith("Set") ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{message}</p>}<Toolbar placeholder="Search work orders…"/><Card className="overflow-hidden"><CardHeader title="Active work orders" description={isSupervisor ? "Department work that still requires action" : "Work currently assigned to you"}/><div className="divide-y divide-slate-100">{rows(active)}{active.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">No active Maintenance work orders.</p>}</div></Card><Card className="overflow-hidden"><CardHeader title="Completed work orders" description={isSupervisor ? "All Maintenance work completed or cancelled" : "Work you completed or that was cancelled"}/><div className="divide-y divide-slate-100">{rows(completed)}{completed.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">No completed Maintenance work orders.</p>}</div></Card><WorkOrderEditor workOrder={selected} canAssign={isSupervisor} onClose={() => setSelected(null)} onSave={saveWorkOrder}/></div>;
}

function PreventiveMaintenance() {
  const allWorkOrders = useWorkOrders();
  const [employee, setEmployee] = useState<DemoEmployee>(demoEmployees["sam.rivera"]);
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  useEffect(() => setEmployee(getDemoEmployeeSession("maintenance") ?? demoEmployees["sam.rivera"]), []);
  const isSupervisor = Boolean(employee.isSupervisor);
  const schedules = allWorkOrders.filter((order) => order.type === "Preventive" && (isSupervisor || order.assignee === employee.name));
  function createSchedule(draft: PreventiveMaintenanceDraft) {
    addWorkOrder({ id: `PM-${100 + allWorkOrders.length}`, ...draft, type: "Preventive", priority: "Standard", status: draft.assignee === "Unassigned" ? "Open" : "Assigned", due: draft.nextDue, createdAt: Date.now(), createdBy: employee.name, requiresHousekeepingClearance: false });
  }
  return <div className="space-y-6"><PageHeading eyebrow="Maintenance" title={isSupervisor ? "Preventive Maintenance" : "My Preventive Maintenance"} description={isSupervisor ? "Schedule recurring upkeep by guest room, amenity, public area, or hotel asset." : `Recurring maintenance assigned to ${employee.name}.`} actions={isSupervisor ? <PreventiveMaintenanceDialog onCreate={createSchedule}/> : undefined}/><Toolbar placeholder="Search room, area, asset, or category…"/><Card className="overflow-hidden"><CardHeader title="Maintenance schedule" description={isSupervisor ? "All preventive work for the property" : "Preventive work assigned to you"}/><div className="divide-y divide-slate-100">{schedules.map((order) => <button key={order.id} type="button" onClick={() => setSelected(order)} className="grid w-full gap-3 px-5 py-4 text-left hover:bg-slate-50 sm:px-6 md:grid-cols-[100px_1fr_150px_130px_130px] md:items-center"><span className="text-sm font-semibold text-brand">{order.id}</span><span><span className="block text-sm font-semibold text-slate-900">{order.title}</span><span className="mt-1 block text-xs text-slate-500">{order.location} · {order.category}</span></span><span className="text-sm text-slate-600">{order.frequency ?? "One time"}</span><span className="text-sm text-slate-500">{order.due ?? "Not scheduled"}</span><Badge tone={order.status === "Completed" ? "success" : order.status === "In Progress" ? "info" : "brand"}>{order.status}</Badge></button>)}{schedules.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No preventive maintenance is assigned for this view.</p>}</div></Card><WorkOrderEditor workOrder={selected} canAssign={isSupervisor} onClose={() => setSelected(null)} onSave={(updated) => updateWorkOrder(updated)}/></div>;
}

function csvCell(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }
function downloadMaintenanceFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MaintenanceReports() {
  const workOrders = useWorkOrders();
  const requests = useServiceRequests();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState("");
  const [reportType, setReportType] = useState<"All Maintenance" | "Work Orders" | "Service Requests" | "Preventive Maintenance">("All Maintenance");
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const inPeriod = (createdAt?: number) => {
    const recordDate = new Date(createdAt ?? Date.now());
    return recordDate.getFullYear() === Number(year) && (month === "" || recordDate.getMonth() === Number(month));
  };
  const annualOrders = workOrders.filter((order) => inPeriod(order.createdAt));
  const annualRequests = requests.filter((request) => request.assigned === "Maintenance" && inPeriod(request.createdAt));
  const correctiveOrders = annualOrders.filter((order) => order.type !== "Preventive");
  const preventiveOrders = annualOrders.filter((order) => order.type === "Preventive");
  const selectedCorrective = reportType === "All Maintenance" || reportType === "Work Orders" ? correctiveOrders : [];
  const selectedRequests = reportType === "All Maintenance" || reportType === "Service Requests" ? annualRequests : [];
  const selectedPreventive = reportType === "All Maintenance" || reportType === "Preventive Maintenance" ? preventiveOrders : [];
  const roomIssues = [...selectedCorrective.map((order) => ({ room: order.location.match(/^Room\s+(\d+)/i)?.[1], issue: order.title, source: order.id })), ...selectedRequests.map((request) => ({ room: request.location.match(/^Room\s+(\d+)/i)?.[1], issue: request.title, source: request.id }))].filter((item): item is { room: string; issue: string; source: string } => Boolean(item.room));
  const roomSummary = Object.values(roomIssues.reduce<Record<string, { room: string; count: number; issues: Set<string> }>>((summary, item) => {
    summary[item.room] ??= { room: item.room, count: 0, issues: new Set() };
    summary[item.room].count += 1;
    summary[item.room].issues.add(item.issue);
    return summary;
  }, {})).sort((a, b) => b.count - a.count || a.room.localeCompare(b.room, undefined, { numeric: true }));
  const reportRows = [
    ...selectedCorrective.map((order) => [order.id, "Work Order", order.title, order.location, order.category, order.priority, order.status, order.assignee, order.due ?? "", order.completionNotes ?? order.description ?? ""]),
    ...selectedRequests.map((request) => [request.id, "Service Request", request.title, request.location, "Service request", request.priority, request.status, request.assignedUser ?? request.assigned, request.due, request.description ?? ""]),
    ...selectedPreventive.map((order) => [order.id, "Preventive Maintenance", order.title, order.location, order.category, order.priority, order.status, order.assignee, order.due ?? "", order.completionNotes ?? order.description ?? ""]),
  ];
  const completedCount = reportRows.filter((row) => row[6] === "Completed").length;
  const roomsInReport = new Set(reportRows.map((row) => String(row[3]).match(/^Room\s+(\d+)/i)?.[1]).filter(Boolean)).size;
  const headers = ["ID", "Type", "Title", "Location", "Category", "Priority", "Status", "Assigned to", "Due", "Notes"];
  const fileType = reportType.toLowerCase().replaceAll(" ", "-");
  const periodLabel = month === "" ? year : `${monthNames[Number(month)]} ${year}`;
  const filePeriod = month === "" ? year : `${year}-${String(Number(month) + 1).padStart(2, "0")}`;
  function exportCsv() { downloadMaintenanceFile(`staysync-${fileType}-${filePeriod}.csv`, [headers, ...reportRows].map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv;charset=utf-8"); }
  function exportExcel() { const table = `<table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${reportRows.map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</td>`).join("")}</tr>`).join("")}</tbody></table>`; downloadMaintenanceFile(`staysync-${fileType}-${filePeriod}.xls`, table, "application/vnd.ms-excel"); }
  return <div className="space-y-6"><PageHeading eyebrow="Maintenance" title="Maintenance Reports" description="Filter and export Maintenance records by month or year, then identify guest rooms with recurring operational issues." actions={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={exportCsv}><Download className="size-4"/>Export CSV</Button><Button variant="secondary" onClick={exportExcel}><ArrowDownToLine className="size-4"/>Export Excel</Button></div>}/><div className="flex flex-wrap gap-3"><label className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">Report type<select aria-label="Maintenance report type" value={reportType} onChange={(event) => setReportType(event.target.value as typeof reportType)} className="bg-transparent text-sm font-semibold text-brand outline-none"><option>All Maintenance</option><option>Work Orders</option><option>Service Requests</option><option>Preventive Maintenance</option></select></label><label className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">Report month<select aria-label="Maintenance report month" value={month} onChange={(event) => setMonth(event.target.value)} className="bg-transparent text-sm font-semibold text-brand outline-none"><option value="">All months</option>{monthNames.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label><label className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">Report year<select aria-label="Maintenance report year" value={year} onChange={(event) => setYear(event.target.value)} className="bg-transparent text-sm font-semibold text-brand outline-none">{[0, 1, 2, 3, 4].map((offset) => <option key={currentYear - offset}>{currentYear - offset}</option>)}</select></label></div><div className="grid gap-4 sm:grid-cols-3"><ReportMetric label="Records" value={String(reportRows.length)} note={`${reportType} · ${periodLabel}`}/><ReportMetric label="Completed" value={String(completedCount)} note="Completed records"/><ReportMetric label="Guest rooms" value={String(roomsInReport)} note="Unique rooms in this report"/></div><Card className="overflow-hidden"><CardHeader title="Repeat room issues" description="Rooms ranked using corrective work orders and service requests in the selected report"/><div className="divide-y divide-slate-100">{roomSummary.map((room, index) => <div key={room.room} className="grid gap-2 px-5 py-4 sm:grid-cols-[70px_1fr_120px] sm:items-center sm:px-6"><span className="text-sm font-bold text-brand">#{index + 1}</span><span><span className="block text-sm font-semibold text-slate-900">Room {room.room}</span><span className="mt-1 block text-xs text-slate-500">{[...room.issues].join(" · ")}</span></span><Badge tone={room.count >= 3 ? "urgent" : room.count === 2 ? "warning" : "neutral"}>{room.count} {room.count === 1 ? "issue" : "issues"}</Badge></div>)}{roomSummary.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No guest-room issues match {reportType.toLowerCase()} for {periodLabel}.</p>}</div></Card></div>;
}

function ReportMetric({ label, value, note }: { label: string; value: string; note: string }) { return <Card className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p></Card>; }

function QualityScores() {
  type CurrentScore = QualityScoreDraft & { id: string; previousScore?: number };
  const [scores, setScores] = useState<CurrentScore[]>([
    { id: "quality-fd", department: "Front Desk", property: "Ottawa Downtown", score: 94, previousScore: 92, target: 92, reviewDate: "2026-07-15", reviewType: "Brand review", reviewer: "General Manager", comments: "", followUp: false },
    { id: "quality-hk", department: "Housekeeping", property: "Ottawa Downtown", score: 91, previousScore: 93, target: 93, reviewDate: "2026-07-10", reviewType: "Quality inspection", reviewer: "General Manager", comments: "", followUp: true },
    { id: "quality-mt", department: "Maintenance", property: "Ottawa Downtown", score: 96, previousScore: 94, target: 90, reviewDate: "2026-07-12", reviewType: "Internal audit", reviewer: "General Manager", comments: "", followUp: false },
  ]);
  function addOrUpdateScore(draft: QualityScoreDraft) {
    const existing = scores.find((score) => score.property === draft.property && score.department === draft.department);
    setScores(existing ? scores.map((score) => score.id === existing.id ? { id: existing.id, previousScore: score.score, ...draft } : score) : [{ id: `quality-${Date.now()}`, ...draft }, ...scores]);
  }
  return <div className="space-y-6"><PageHeading eyebrow="Management" title="Department quality scores" description="Share each department’s current score and latest movement to keep teams informed and motivated." actions={<QualityScoreDialog onCreate={addOrUpdateScore}/>}/><div className="grid gap-4 md:grid-cols-3">{scores.map((score) => { const change = score.previousScore === undefined ? null : score.score - score.previousScore; return <Card key={score.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{score.department}</p><p className="mt-1 text-xs text-slate-400">{score.property}</p></div>{score.followUp && <Badge tone="warning">Follow-up required</Badge>}</div><div className="mt-5 flex items-end gap-2"><p className="text-4xl font-bold tracking-tight">{score.score}%</p><p className="mb-1 text-xs text-slate-400">Target {score.target}%</p></div>{change !== null && <div className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${change > 0 ? "bg-emerald-50 text-emerald-700" : change < 0 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{change > 0 ? <ArrowUp className="size-3.5"/> : change < 0 ? <ArrowDown className="size-3.5"/> : <Minus className="size-3.5"/>}{change > 0 ? `Up ${change} ${change === 1 ? "point" : "points"} from previous score` : change < 0 ? `Down ${Math.abs(change)} ${change === -1 ? "point" : "points"} from previous score` : "No change from previous score"}</div>}<div className="mt-4 h-1.5 rounded-full bg-slate-100"><div className={`h-full rounded-full ${score.score >= score.target ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${score.score}%` }}/></div><p className="mt-4 text-xs text-slate-500">Updated {score.reviewDate}</p><div className="mt-4 [&>button]:w-full"><QualityScoreDialog current={score} onCreate={(draft) => setScores(scores.map((item) => item.id === score.id ? { id: score.id, previousScore: item.score, ...draft } : item))}/></div></Card>; })}</div></div>;
}

function ManagementIncidentsPage({ autoOpen = false }: { autoOpen?: boolean }) {
  const incidents = useIncidents();
  const [selected, setSelected] = useState<IncidentRecord | null>(null);
  function createIncident(draft: Parameters<React.ComponentProps<typeof ManagementIncidentDialog>["onCreate"]>[0]) {
    const id = `INC-${209 + incidents.length}`;
    addIncident({ id, title: `${id} · ${draft.category}`, detail: `${draft.location} · Assigned to ${draft.department}`, status: "Open", tone: draft.severity === "High" || draft.severity === "Critical" ? "urgent" : "warning", assignedDepartment: draft.department, createdByDepartment: "Management", createdBy: "General Manager", createdAt: Date.now(), category: draft.category, property: draft.property, location: draft.location, severity: draft.severity, owner: draft.owner, reportable: draft.reportable });
  }
  return <div className="space-y-6">
    <PageHeading eyebrow="Management" title="Incidents" description="View every property incident. Management can update only records assigned to Management." actions={<ManagementIncidentDialog defaultOpen={autoOpen} onCreate={createIncident}/>}/>
    <Toolbar placeholder="Search incidents, properties, or locations…"/>
    <Card><div className="divide-y divide-slate-100">{incidents.map((incident) => <article key={incident.id}><button type="button" onClick={() => setSelected(incident)} className="flex w-full items-center gap-4 px-5 py-5 text-left hover:bg-slate-50 sm:px-6"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900">{incident.title}</p>{incident.reportable && <Badge tone="warning">Reporting review</Badge>}</div><p className="mt-1 text-sm text-slate-500">{incident.property ? `${incident.property} · ` : ""}{incident.detail}</p></div>{incident.severity && <Badge tone={incident.severity === "Critical" || incident.severity === "High" ? "urgent" : "warning"}>{incident.severity}</Badge>}<Badge tone={incident.tone}>{incident.status}</Badge><span className={`text-xs font-semibold ${incident.assignedDepartment === "Management" ? "text-brand" : "text-slate-400"}`}>{incident.assignedDepartment === "Management" ? "Update" : "View status"}</span></button></article>)}</div></Card>
    <IncidentEditor record={selected} currentDepartment="Management" onClose={() => setSelected(null)} onSave={(record) => updateIncident(record as IncidentRecord)} onDelete={(record) => record.id && deleteIncident(record.id)}/>
  </div>;
}

function PropertiesPage() {
  const [properties, setProperties] = useState([
    { id: "property-downtown", name: "Ottawa Downtown", code: "OTT-DT", location: "Ottawa, Ontario", rooms: 142, timezone: "America/Toronto", status: "Active" },
    { id: "property-airport", name: "Ottawa Airport", code: "OTT-AP", location: "Ottawa, Ontario", rooms: 118, timezone: "America/Toronto", status: "Active" },
  ]);
  const secureMode = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_DEMO_MODE !== "true";
  const [loading, setLoading] = useState(secureMode);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (!secureMode) return;
    fetch("/api/management/properties", { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Properties could not be loaded.");
      setProperties(result.properties); setLoading(false);
    }).catch((error) => { setLoadError(error instanceof Error ? error.message : "Properties could not be loaded."); setLoading(false); });
  }, [secureMode]);
  async function createProperty(draft: Parameters<React.ComponentProps<typeof PropertyDialog>["onCreate"]>[0]) {
    if (!secureMode) { setProperties((current) => [{ id: `property-${Date.now()}`, name: draft.name, code: draft.code, location: `${draft.city}, ${draft.region}`, rooms: draft.rooms, timezone: draft.timezone, status: draft.status }, ...current]); return; }
    const response = await fetch("/api/management/properties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "The property could not be created.");
    setProperties((current) => [result.property, ...current]);
  }
  return <div className="space-y-6"><PageHeading eyebrow="Northstar Hotels" title="Properties" description="Manage hotel identity, location, operating timezone, and room inventory." actions={<PropertyDialog onCreate={createProperty}/>}/><Toolbar placeholder="Search properties, codes, or locations…"/>{loadError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p>}<Card><div className="divide-y divide-slate-100">{loading ? <p className="px-5 py-10 text-center text-sm text-slate-500">Loading authorized properties…</p> : properties.map((property) => <article key={property.id} className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:px-6"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900">{property.name}</p><span className="text-xs font-semibold text-slate-400">{property.code}</span></div><p className="mt-1 text-sm text-slate-500">{property.location} · {property.rooms} rooms · {property.timezone}</p></div><Badge tone={property.status === "Active" ? "success" : "warning"}>{property.status}</Badge></article>)}</div></Card></div>;
}

function AccountSettings({ role }: { role: WorkspaceRole }) {
  const demoMode = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  return demoMode ? <DemoAccountSettings role={role}/> : <SecureAccountSettings role={role}/>;
}

function SecureAccountSettings({ role }: { role: WorkspaceRole }) {
  const [account, setAccount] = useState<{ name: string; title: string; username: string; email: string; accountKind: "EMPLOYEE" | "ACCOUNT_HOLDER" } | null>(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  useEffect(() => {
    fetch("/api/account", { cache: "no-store" }).then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setAccount(result.account); }).catch((error) => setProfileMessage(error instanceof Error ? error.message : "Account settings could not be loaded."));
  }, []);
  async function update(payload: Record<string, string>) {
    const response = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Your account could not be updated.");
  }
  if (!account) return <div className="space-y-6"><PageHeading eyebrow={workspaceNames[role]} title="Account settings" description="Manage your sign-in details and personal account security."/>{profileMessage ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{profileMessage}</p> : <Card className="p-6 text-sm text-slate-500">Loading account settings…</Card>}</div>;
  return <div className="space-y-6"><PageHeading eyebrow={workspaceNames[role]} title="Account settings" description="Manage your sign-in details and personal account security."/><div className="grid gap-6 xl:grid-cols-2"><Card className="p-6"><h2 className="text-lg font-semibold text-slate-950">Profile and sign-in</h2><p className="mt-1 text-sm text-slate-500">These details come from your authenticated StaySync account.</p><form className="mt-6 space-y-4" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setProfileMessage(""); try { await update({ action: "profile", name: String(form.get("displayName")), ...(account.accountKind === "ACCOUNT_HOLDER" ? { email: String(form.get("email")) } : { username: String(form.get("username")) }) }); setAccount({ ...account, name: String(form.get("displayName")), email: account.accountKind === "ACCOUNT_HOLDER" ? String(form.get("email")) : account.email, username: account.accountKind === "EMPLOYEE" ? String(form.get("username")) : account.username }); setProfileMessage("Profile saved successfully."); } catch (error) { setProfileMessage(error instanceof Error ? error.message : "Your profile could not be updated."); } }}><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Display name</span><input name="displayName" defaultValue={account.name} required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/></label>{account.accountKind === "ACCOUNT_HOLDER" ? <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Account email</span><input name="email" type="email" defaultValue={account.email} required autoComplete="email" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/></label> : <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Username</span><input name="username" defaultValue={account.username} required autoComplete="username" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/></label>}<label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Role</span><input value={account.title} readOnly className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"/></label>{profileMessage && <p role="status" className={`rounded-xl px-3 py-2 text-sm ${profileMessage.includes("successfully") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{profileMessage}</p>}<Button type="submit">Save profile</Button></form></Card><Card className="p-6"><h2 className="text-lg font-semibold text-slate-950">Change password</h2><p className="mt-1 text-sm text-slate-500">Confirm your current password before choosing a new one.</p><form className="mt-6 space-y-4" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const currentPassword = String(form.get("currentPassword")); const newPassword = String(form.get("newPassword")); const confirmPassword = String(form.get("confirmPassword")); if (newPassword !== confirmPassword) { setPasswordMessage("The new passwords do not match."); return; } setPasswordMessage(""); try { await update({ action: "password", currentPassword, newPassword }); event.currentTarget.reset(); setPasswordMessage("Password updated successfully."); } catch (error) { setPasswordMessage(error instanceof Error ? error.message : "Your password could not be updated."); } }}><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Current password</span><input name="currentPassword" type="password" required minLength={8} autoComplete="current-password" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/></label><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">New password</span><input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/></label><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm new password</span><input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/></label>{passwordMessage && <p role="status" className={`rounded-xl px-3 py-2 text-sm ${passwordMessage.includes("successfully") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{passwordMessage}</p>}<Button type="submit">Update password</Button></form></Card></div></div>;
}

function DemoAccountSettings({ role }: { role: WorkspaceRole }) {
  const accounts = useUserAccounts();
  const fallbackUsernames: Record<WorkspaceRole, string> = { "front-desk": "alex.morgan", housekeeping: "priya.shah", maintenance: "jordan.lee", "food-beverage": "olivia.bennett", manager: "maya.chen" };
  const signedInAccount = accounts.find((item) => item.username === getSavedDemoEmployeeUsername() && item.workspace === role);
  const account = role === "manager" ? accounts.find((item) => item.primaryAccount) : signedInAccount ?? accounts.find((item) => item.username === fallbackUsernames[role]);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  if (!account) return null;
  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("displayName")).trim();
    const username = String(form.get("username")).trim().toLowerCase();
    const email = role === "manager" ? String(form.get("email")).trim().toLowerCase() : account.email;
    if (!name || !username || (role === "manager" && !email)) return setProfileMessage(role === "manager" ? "Name, username, and email are required." : "Name and username are required.");
    if (accounts.some((item) => item.id !== account.id && item.username === username)) return setProfileMessage("That username is already in use.");
    if (email && accounts.some((item) => item.id !== account.id && item.email === email)) return setProfileMessage("That email address is already in use.");
    updateUserAccount({ ...account, name, username, email });
    if (role === "manager") saveDemoEmployeeSession(username);
    setProfileMessage("Profile saved successfully.");
  }
  function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;
    const form = new FormData(event.currentTarget);
    const current = String(form.get("currentPassword"));
    const next = String(form.get("newPassword"));
    const confirm = String(form.get("confirmPassword"));
    if (current !== account.password) return setPasswordMessage("The current password is incorrect.");
    if (next.length < 8) return setPasswordMessage("Use at least 8 characters for your new password.");
    if (next !== confirm) return setPasswordMessage("The new passwords do not match.");
    updateUserAccount({ ...account, password: next });
    event.currentTarget.reset();
    setPasswordMessage("Password updated successfully.");
  }
  return <div className="space-y-6">
    <PageHeading eyebrow={workspaceNames[role]} title="Account settings" description={role === "manager" ? "Manage the primary property account, sign-in credentials, and notifications." : "Manage your personal profile, password, and notification preferences."}/>
    <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
      <div className="space-y-6">
        <Card className="p-5 sm:p-6"><h2 className="text-base font-semibold text-slate-900">Profile</h2><p className="mt-1 text-sm text-slate-500">{role === "manager" ? "This is the primary account for Ottawa Downtown. Its contact and sign-in details can be transferred to a new General Manager at any time." : "Your staff account uses a username and password for this hotel workspace."}</p><form key={`${account.id}-${account.username}-${account.email}`} className="mt-5 space-y-4" onSubmit={saveProfile}><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Display name</span><input name="displayName" defaultValue={account.name} required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/></label><div className={`grid gap-4 ${role === "manager" ? "sm:grid-cols-2" : ""}`}><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Username</span><input name="username" defaultValue={account.username} readOnly={role !== "manager"} required className={`h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand ${role !== "manager" ? "bg-slate-50 text-slate-500" : ""}`}/></label>{role === "manager" && <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</span><input name="email" type="email" defaultValue={account.email} required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/></label>}</div><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Department</span><input value={departmentLabels[account.workspace]} readOnly className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"/></label><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Role</span><input value={account.title} readOnly className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"/></label></div><div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">{profileMessage && <span role="status" className={`text-sm font-medium ${profileMessage.includes("successfully") ? "text-emerald-700" : "text-rose-700"}`}>{profileMessage}</span>}<Button type="submit">Save profile</Button></div></form></Card>
        <Card className="p-5 sm:p-6"><h2 className="text-base font-semibold text-slate-900">Password and security</h2><p className="mt-1 text-sm text-slate-500">Choose a unique password you do not use elsewhere.</p><form className="mt-5 space-y-4" onSubmit={changePassword}><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Current password</span><input name="currentPassword" type="password" autoComplete="current-password" required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/></label><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">New password</span><input name="newPassword" type="password" autoComplete="new-password" required minLength={8} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/></label><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm new password</span><input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/></label></div>{passwordMessage && <p role="status" className={`text-sm ${passwordMessage.includes("successfully") ? "text-emerald-700" : "text-rose-700"}`}>{passwordMessage}</p>}<div className="flex justify-end border-t border-slate-100 pt-4"><Button type="submit">Update password</Button></div></form></Card>
      </div>
      <Card className="h-fit p-5 sm:p-6"><h2 className="text-base font-semibold text-slate-900">Notifications</h2><p className="mt-1 text-sm text-slate-500">Choose which operational updates should alert you.</p><div className="mt-5 divide-y divide-slate-100"><label className="flex min-h-16 items-center gap-3 py-3"><input type="checkbox" defaultChecked className="size-4 rounded border-slate-300 text-brand"/><span><span className="block text-sm font-semibold text-slate-800">Assigned work</span><span className="block text-xs text-slate-500">New requests assigned to your department</span></span></label><label className="flex min-h-16 items-center gap-3 py-3"><input type="checkbox" defaultChecked className="size-4 rounded border-slate-300 text-brand"/><span><span className="block text-sm font-semibold text-slate-800">Request reminders</span><span className="block text-xs text-slate-500">Follow-up reminders sent by Front Desk</span></span></label><label className="flex min-h-16 items-center gap-3 py-3"><input type="checkbox" defaultChecked className="size-4 rounded border-slate-300 text-brand"/><span><span className="block text-sm font-semibold text-slate-800">Shared Operations Logs</span><span className="block text-xs text-slate-500">Updates shared with your department</span></span></label></div></Card>
    </div>
  </div>;
}

function PeoplePage() {
  const demoAccounts = useUserAccounts();
  const secureMode = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_DEMO_MODE !== "true";
  const [remoteAccounts, setRemoteAccounts] = useState<UserAccount[]>([]);
  const [properties, setProperties] = useState<Array<{ id?: string; name: string }>>([{ name: "Ottawa Downtown" }, { name: "Ottawa Airport" }]);
  const [loadError, setLoadError] = useState("");
  const accounts = secureMode ? remoteAccounts : demoAccounts;
  const [query, setQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  useEffect(() => {
    if (!secureMode) return;
    Promise.all([fetch("/api/management/users", { cache: "no-store" }), fetch("/api/management/properties", { cache: "no-store" })]).then(async ([usersResponse, propertiesResponse]) => {
      const usersResult = await usersResponse.json();
      const propertiesResult = await propertiesResponse.json();
      if (!usersResponse.ok) throw new Error(usersResult.error ?? "Users could not be loaded.");
      if (!propertiesResponse.ok) throw new Error(propertiesResult.error ?? "Properties could not be loaded.");
      setRemoteAccounts(usersResult.users.map((account: UserAccount) => ({ ...account, password: "" })));
      setProperties(propertiesResult.properties.map((property: { id: string; name: string }) => ({ id: property.id, name: property.name })));
    }).catch((error) => setLoadError(error instanceof Error ? error.message : "People and property access could not be loaded."));
  }, [secureMode]);
  async function saveAccount(account: UserAccount, editing: boolean) {
    if (!secureMode) { if (editing) updateUserAccount(account); else addUserAccount(account); return; }
    const propertyId = account.propertyId ?? properties.find((property) => property.name === account.property)?.id;
    if (!propertyId) throw new Error("Select an authorized property.");
    const response = await fetch(editing ? `/api/management/users/${account.id}` : "/api/management/users", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: account.name, username: account.username, password: account.password, workspace: account.workspace, title: account.title, propertyId }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "The employee account could not be saved.");
    if (editing) setRemoteAccounts((current) => current.map((item) => item.id === account.id ? { ...account, propertyId, password: "", status: account.password ? "Temporary password" : item.status } : item));
    else setRemoteAccounts((current) => [{ ...result.user, password: "" }, ...current]);
  }
  async function removeAccount(accountId: string) {
    if (!secureMode) { deleteUserAccount(accountId); return; }
    const response = await fetch(`/api/management/users/${accountId}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "The employee account could not be suspended.");
    setRemoteAccounts((current) => current.filter((account) => account.id !== accountId));
  }
  const visibleAccounts = accounts.filter((account) => `${account.name} ${account.username} ${account.title} ${account.property}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-6"><PageHeading eyebrow="All properties" title="People & access" description="Create employee sign-ins, assign their property and title, update credentials, or suspend access." actions={<UserAccountDialog accounts={accounts} properties={properties} onSave={saveAccount}/>}/>{loadError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p>}<label className="relative block"><span className="sr-only">Search people</span><Search className="absolute left-3.5 top-3.5 size-4 text-slate-400"/><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, usernames, titles, or properties…" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm shadow-sm focus:border-brand"/></label><Card className="overflow-hidden"><div className="divide-y divide-slate-100">{visibleAccounts.map((account) => <article key={account.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900">{account.name}</p>{account.primaryAccount && <Badge tone="brand">Primary account</Badge>}<Badge tone={account.status === "Active" ? "success" : "warning"}>{account.status}</Badge></div><p className="mt-1 text-sm text-slate-500">{account.title} · {account.property}</p></div><div className="flex flex-wrap gap-2">{account.primaryAccount ? <a href="/app/manager/settings" className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-brand hover:bg-brand-soft">Manage primary account</a> : <><UserAccountDialog accounts={accounts} account={account} properties={properties} onSave={saveAccount}/><Button type="button" size="sm" variant={confirmDeleteId === account.id ? "danger" : "ghost"} onClick={async () => { if (confirmDeleteId === account.id) { try { await removeAccount(account.id); setLoadError(""); } catch (error) { setLoadError(error instanceof Error ? error.message : "The employee account could not be suspended."); } setConfirmDeleteId(null); } else setConfirmDeleteId(account.id); }}>{confirmDeleteId === account.id ? "Confirm suspend" : "Suspend"}</Button></>}</div></article>)}{visibleAccounts.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No users match your search.</p>}</div></Card></div>;
}

function UserAccountDialog({ accounts, account, properties = [{ name: "Ottawa Downtown" }, { name: "Ottawa Airport" }], onSave }: { accounts: UserAccount[]; account?: UserAccount; properties?: Array<{ id?: string; name: string }>; onSave?: (account: UserAccount, editing: boolean) => void | Promise<void> }) {
  const departments = useDepartments();
  const [open, setOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceRole>(account?.workspace ?? "front-desk");
  const [title, setTitle] = useState(account?.title ?? getDepartmentTitles("front-desk", departments)[0]);
  const [property, setProperty] = useState(account?.property ?? properties[0]?.name ?? "");
  const [error, setError] = useState("");
  const [addingDepartment, setAddingDepartment] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  function changeDepartment(next: WorkspaceRole) { setWorkspace(next); setTitle(getDepartmentTitles(next, departments)[0]); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const username = String(form.get("username")).trim().toLowerCase();
    const password = String(form.get("password"));
    if (accounts.some((item) => item.id !== account?.id && item.username === username)) return setError("That username is already in use.");
    if (!account && password.length < 8) return setError("Use at least 8 characters for the temporary password.");
    if (account && password && password.length < 8) return setError("Use at least 8 characters for the new password.");
    const next: UserAccount = { id: account?.id ?? `user-${Date.now()}`, name, username, password: password || account?.password || "", workspace, title, isSupervisor: title.includes("Supervisor") || workspace === "manager", property, propertyId: properties.find((item) => item.name === property)?.id, status: account?.status ?? "Temporary password", primaryAccount: account?.primaryAccount };
    try { if (onSave) await onSave(next, Boolean(account)); else if (account) updateUserAccount(next); else addUserAccount(next); setError(""); setOpen(false); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The employee account could not be saved."); }
  }
  return <Dialog.Root open={open} onOpenChange={(next) => { setOpen(next); if (next) setError(""); }}><Dialog.Trigger asChild>{account ? <Button type="button" size="sm" variant="secondary">Edit user</Button> : <Button type="button"><Plus className="size-4"/>Create user</Button>}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm"/><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-xl font-bold tracking-tight text-slate-950">{account ? `Edit ${account.name}` : "Create user"}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">{account ? "Update this employee’s username, property, position, or issue a temporary password." : "Create a username and temporary password, then assign the employee to a property."}</Dialog.Description></div><Dialog.Close className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-5"/></Dialog.Close></div><form className="mt-6 space-y-4" onSubmit={submit}><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Full name</span><input name="name" defaultValue={account?.name} required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/></label><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Username</span><input name="username" defaultValue={account?.username} required autoCapitalize="none" pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,49}" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/></label><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Property</span><select aria-label="Property" value={property} onChange={(event) => setProperty(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-brand">{properties.map((item) => <option key={item.id ?? item.name}>{item.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Department</span><select aria-label="Department" value={workspace} onChange={(event) => changeDepartment(event.target.value as WorkspaceRole)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-brand">{departments.map((item) => <option key={item.workspace} value={item.workspace}>{item.name}</option>)}</select>{addingDepartment ? <div className="mt-2 flex gap-2"><input aria-label="New department name" value={newDepartmentName} onChange={(event) => setNewDepartmentName(event.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-xs" placeholder="Department name"/><button type="button" className="rounded-lg bg-brand px-3 text-xs font-semibold text-white" onClick={() => { try { const added = addDepartment(newDepartmentName); setWorkspace(added.workspace); setTitle(added.titles[0]); setNewDepartmentName(""); setAddingDepartment(false); } catch (caught) { setError(caught instanceof Error ? caught.message : "Department could not be added."); } }}>Add</button></div> : <button type="button" onClick={() => setAddingDepartment(true)} className="mt-2 text-xs font-semibold text-brand hover:underline">+ Add department</button>}</label><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Position</span><select aria-label="Position" value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-brand">{getDepartmentTitles(workspace, departments).map((value) => <option key={value}>{value}</option>)}</select></label></div><p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">New departments receive Operations Log and Incident Reports access only.</p><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{account ? "Reset password (optional)" : "Temporary password"}</span><input name="password" type="password" required={!account} minLength={account ? undefined : 8} autoComplete="new-password" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/><span className="mt-1.5 block text-xs text-slate-400">At least 8 characters. {account ? "Leave blank to keep the existing sign-in. The current password is never displayed." : "Share it securely. StaySync never returns or displays it after creation."}</span></label>{error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><Dialog.Close asChild><Button type="button" variant="secondary">Cancel</Button></Dialog.Close><Button type="submit">{account ? "Save changes" : "Create user"}</Button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>;
}

type ReportRow = { key: string; createdAt: number; departments: string[]; values: Record<string, string> };
const reportColumns = ["ID", "Title", "Property", "Department", "Visibility", "Priority", "Status", "Created", "Author"];

function downloadReport(rows: ReportRow[], columns: string[], format: "csv" | "excel") {
  const safeCell = (value: string) => {
    const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
    return format === "csv" ? `"${safe.replaceAll('"', '""')}"` : safe.replaceAll("\t", " ");
  };
  const separator = format === "csv" ? "," : "\t";
  const content = [columns.map(safeCell).join(separator), ...rows.map((row) => columns.map((column) => safeCell(row.values[column] ?? "")).join(separator))].join("\r\n");
  const blob = new Blob([content], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `staysync-report-${new Date().toISOString().slice(0, 10)}.${format === "csv" ? "csv" : "xls"}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Reports() {
  const requests = useServiceRequests();
  const incidents = useIncidents();
  const workOrders = useWorkOrders();
  const roomUpdates = useRoomUpdates();
  const roomAssignments = useHousekeepingRooms();
  const departments = useDepartments();
  const [reportType, setReportType] = useState("Service requests");
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [property, setProperty] = useState("All properties");
  const [department, setDepartment] = useState("All departments");
  const [status, setStatus] = useState("All statuses");
  const [columns, setColumns] = useState(["ID", "Title", "Department", "Priority", "Status", "Created"]);
  const [generated, setGenerated] = useState({ reportType, dateRange, property, department, status });
  const [message, setMessage] = useState("");
  const allRows = useMemo<ReportRow[]>(() => {
    const requestRows = requests.map((request) => ({ key: request.id, createdAt: request.createdAt ?? Date.now(), departments: [request.from, request.assigned], values: { ID: request.id, Title: request.title, Property: "Ottawa Downtown", Department: request.assigned, Visibility: `Requested by ${request.from}`, Priority: request.priority, Status: request.status, Created: new Date(request.createdAt ?? Date.now()).toLocaleDateString(), Author: request.createdBy ?? request.from } }));
    const incidentRows = incidents.map((incident) => ({ key: incident.id, createdAt: incident.createdAt ?? Date.now(), departments: [incident.createdByDepartment, incident.assignedDepartment], values: { ID: incident.id, Title: incident.title.replace(/^INC-\d+ · /, ""), Property: incident.property ?? "Ottawa Downtown", Department: incident.assignedDepartment, Visibility: `Created by ${incident.createdByDepartment}`, Priority: incident.tone === "urgent" ? "Urgent" : "Important", Status: incident.status, Created: new Date(incident.createdAt ?? Date.now()).toLocaleDateString(), Author: incident.createdBy ?? "Hotel team" } }));
    const logRows = (latestLogs as EditableLog[]).map((log) => ({ key: log.id, createdAt: log.createdAt ?? Date.now(), departments: [log.department, ...(log.sharedWith ?? [])], values: { ID: log.id, Title: log.message, Property: "Ottawa Downtown", Department: log.department, Visibility: log.sharedWith?.length ? `Shared with ${log.sharedWith.join(", ")}` : "Department internal", Priority: log.priority, Status: "Published", Created: log.time, Author: log.author } }));
    const orderRows = workOrders.filter((order) => order.type !== "Preventive").map((order) => ({ key: order.id, createdAt: order.createdAt ?? Date.now(), departments: ["Maintenance"], values: { ID: order.id, Title: `${order.title} · ${order.location}`, Property: "Ottawa Downtown", Department: "Maintenance", Visibility: order.assignee === "Unassigned" ? "Supervisor queue" : `Assigned to ${order.assignee}`, Priority: order.priority, Status: order.status, Created: new Date(order.createdAt ?? Date.now()).toLocaleDateString(), Author: order.createdBy ?? "Maintenance" } }));
    const preventiveRows = workOrders.filter((order) => order.type === "Preventive").map((order) => ({ key: order.id, createdAt: order.createdAt ?? Date.now(), departments: ["Maintenance"], values: { ID: order.id, Title: `${order.title} · ${order.location} · ${order.frequency ?? "One time"}`, Property: "Ottawa Downtown", Department: "Maintenance", Visibility: order.assignee === "Unassigned" ? "Supervisor queue" : `Assigned to ${order.assignee}`, Priority: order.priority, Status: order.status, Created: new Date(order.createdAt ?? Date.now()).toLocaleDateString(), Author: order.createdBy ?? "Maintenance" } }));
    const roomUpdateRows = roomUpdates.map((update, index) => ({ key: update.id ?? `room-${update.room}-${index}`, createdAt: Date.now(), departments: ["Front Desk", "Housekeeping"], values: { ID: update.id ?? `Room ${update.room}`, Title: `${update.type} · Room ${update.room} · ${update.detail}`, Property: "Ottawa Downtown", Department: "Housekeeping", Visibility: "Shared by Front Desk", Priority: "Standard", Status: update.state, Created: update.time, Author: update.createdBy ?? "Front Desk" } }));
    const assignmentRows = roomAssignments.map((assignment) => ({ key: `assignment-${assignment.room}`, createdAt: Date.now(), departments: ["Housekeeping"], values: { ID: `Room ${assignment.room}`, Title: assignment.service, Property: "Ottawa Downtown", Department: "Housekeeping", Visibility: `Assigned to ${assignment.assignedTo}`, Priority: assignment.priority, Status: assignment.status, Created: "Today", Author: "Housekeeping supervisor" } }));
    if (generated.reportType === "Incidents") return incidentRows;
    if (generated.reportType === "Operations logs") return logRows;
    if (generated.reportType === "Work orders") return orderRows;
    if (generated.reportType === "Preventive maintenance") return preventiveRows;
    if (generated.reportType === "Room status updates") return roomUpdateRows;
    if (generated.reportType === "Housekeeping assignments") return assignmentRows;
    if (generated.reportType === "All operational activity") return [...requestRows, ...incidentRows, ...logRows, ...orderRows, ...preventiveRows, ...roomUpdateRows, ...assignmentRows];
    return requestRows;
  }, [generated.reportType, incidents, requests, roomAssignments, roomUpdates, workOrders]);
  const rows = useMemo(() => {
    const days = generated.dateRange === "Last 7 days" ? 7 : generated.dateRange === "Last 30 days" ? 30 : null;
    const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;
    return allRows.filter((row) => (!days || row.createdAt >= cutoff) && (generated.property === "All properties" || row.values.Property === generated.property) && (generated.department === "All departments" || row.departments.includes(generated.department)) && (generated.status === "All statuses" || row.values.Status === generated.status));
  }, [allRows, generated]);
  const statuses = [...new Set(allRows.map((row) => row.values.Status))];
  const selectClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-brand";
  const applyReport = () => { if (!columns.length) { setMessage("Select at least one column."); return; } setGenerated({ reportType, dateRange, property, department, status }); setMessage("Report updated."); };
  const saveTemplate = () => { window.localStorage.setItem("staysync-saved-report", JSON.stringify({ reportType, dateRange, property, department, status, columns })); setMessage("Report template saved on this device."); };
  return <div className="space-y-6">
    <PageHeading eyebrow="Management" title="Report builder" description="Choose a scope, generate a live preview, and export exactly the displayed rows." actions={<Button type="button" variant="secondary" onClick={saveTemplate}><Archive className="size-4"/>Save template</Button>}/>
    {message && <p role="status" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">{message}</p>}
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <Card className="h-fit p-5"><h2 className="font-semibold text-slate-900">Report criteria</h2><div className="mt-5 space-y-4">
        <ReportSelect label="Report type" value={reportType} onChange={(value) => { setReportType(value); setStatus("All statuses"); }} options={["All operational activity", "Service requests", "Incidents", "Operations logs", "Work orders", "Preventive maintenance", "Room status updates", "Housekeeping assignments"]} className={selectClass}/>
        <ReportSelect label="Date range" value={dateRange} onChange={setDateRange} options={["Last 7 days", "Last 30 days", "All time"]} className={selectClass}/>
        <ReportSelect label="Property" value={property} onChange={setProperty} options={["All properties", "Ottawa Downtown", "Ottawa Airport"]} className={selectClass}/>
        <ReportSelect label="Filter by department" value={department} onChange={setDepartment} options={["All departments", "Management", ...departments.map((item) => item.name)]} className={selectClass}/>
        <ReportSelect label="Status" value={status} onChange={setStatus} options={["All statuses", ...statuses]} className={selectClass}/>
        <fieldset><legend className="text-sm font-semibold text-slate-700">Columns</legend><div className="mt-2 grid grid-cols-2 gap-2">{reportColumns.map((column) => <label key={column} className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600"><input aria-label={`Include ${column} column`} type="checkbox" checked={columns.includes(column)} onChange={(event) => setColumns(event.target.checked ? [...columns, column] : columns.filter((item) => item !== column))} className="size-4 rounded border-slate-300 text-brand"/>{column}</label>)}</div></fieldset>
        <Button type="button" className="w-full" onClick={applyReport}><SlidersHorizontal className="size-4"/>Generate report</Button>
      </div></Card>
      <Card className="overflow-hidden"><CardHeader title="Preview" description={`${rows.length} ${rows.length === 1 ? "row" : "rows"} · ${generated.reportType}`} action={<div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" disabled={!rows.length || !columns.length} onClick={() => downloadReport(rows, columns, "csv")}><Download className="size-4"/>CSV</Button><Button type="button" size="sm" variant="secondary" disabled={!rows.length || !columns.length} onClick={() => downloadReport(rows, columns, "excel")}><ArrowDownToLine className="size-4"/>Excel</Button><Button type="button" size="sm" variant="ghost" disabled={!rows.length} onClick={() => window.print()}><Printer className="size-4"/><span className="sr-only">Print report</span></Button></div>}/><div className="overflow-x-auto">{rows.length && columns.length ? <table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b bg-slate-50/70 text-xs uppercase tracking-wide text-slate-400">{columns.map((column) => <th key={column} className="px-5 py-3 font-semibold">{column}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.key} className="border-b last:border-0">{columns.map((column) => <td key={column} className="max-w-xs whitespace-nowrap px-5 py-4 text-slate-600">{row.values[column]}</td>)}</tr>)}</tbody></table> : <p className="px-5 py-12 text-center text-sm text-slate-500">No records match the generated criteria.</p>}</div></Card>
    </div>
  </div>;
}

function ReportSelect({ label, value, options, onChange, className }: { label: string; value: string; options: string[]; onChange: (value: string) => void; className: string }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={className}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function IncidentsPage({ role = "front-desk", autoOpen = false }: { role?: WorkspaceRole; autoOpen?: boolean }) {
  const records = useIncidents();
  const accounts = useUserAccounts();
  const departments = useDepartments();
  const [selectedRecord, setSelectedRecord] = useState<IncidentRecord | null>(null);
  const department = getDepartmentLabel(role, departments);
  const employeeName = accounts.find((account) => account.workspace === role)?.name ?? (role === "food-beverage" ? demoEmployees["olivia.bennett"].name : "Alex Morgan");
  const visibleRecords = records.filter((record) => record.createdByDepartment === department || record.assignedDepartment === department);
  return <div className="space-y-6"><PageHeading eyebrow={department} title="Incident Reports" description="Only incidents created by or assigned to your department appear here." actions={<IncidentDialog defaultOpen={autoOpen} onCreate={(draft) => { const id = `INC-${211 + records.length}`; addIncident({ id, title: `${id} · ${draft.category}`, detail: `${draft.location} · Assigned to ${draft.department}`, status: draft.priority === "Urgent" ? "Urgent review" : "Awaiting review", tone: draft.priority === "Urgent" ? "urgent" : "warning", assignedDepartment: draft.department, createdByDepartment: department, createdAt: Date.now(), createdBy: employeeName }); }}/>}/><Toolbar placeholder="Search incidents, rooms, or locations…"/><Card><div className="divide-y divide-slate-100">{visibleRecords.map((record) => { const assignedToDepartment = record.assignedDepartment === department; return <button key={record.id} onClick={() => setSelectedRecord(record)} className="flex w-full items-center gap-4 px-5 py-5 text-left hover:bg-slate-50 sm:px-6"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{record.title}</p><p className="mt-1 text-sm text-slate-500">{record.detail}</p></div><Badge tone={record.tone}>{record.status}</Badge><span className={`text-xs font-semibold ${assignedToDepartment ? "text-brand" : "text-slate-400"}`}>{assignedToDepartment ? "Update" : "View status"}</span></button>; })}{visibleRecords.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No incidents created by or assigned to {department}.</p>}</div></Card><IncidentEditor record={selectedRecord} currentDepartment={department} onClose={() => setSelectedRecord(null)} onSave={(updated) => updateIncident(updated as IncidentRecord)} onDelete={(deleted) => deleted.id && deleteIncident(deleted.id)}/></div>;
}

function LostFoundPage({ autoOpen = false }: { autoOpen?: boolean }) {
  const [records, setRecords] = useState<EditableOperationalRecord[]>(genericRecords("lost-found"));
  const [selectedRecord, setSelectedRecord] = useState<EditableOperationalRecord | null>(null);
  return <div className="space-y-6"><PageHeading eyebrow="Front Desk" title="Lost & Found" description="Track found items from discovery and secure storage through guest pickup or shipping." actions={<LostFoundDialog defaultOpen={autoOpen} onCreate={(draft) => setRecords([{ title: draft.item, detail: `Found in ${draft.foundLocation}${draft.room ? ` · Room ${draft.room}` : ""} · Found ${draft.foundAt} · Stored in ${draft.storedAt}`, room: draft.room, foundAt: draft.foundAt, foundLocation: draft.foundLocation, storageLocation: draft.storedAt, status: draft.followUp, tone: draft.followUp === "Not started" ? "warning" : "info", createdAt: Date.now(), createdBy: "Alex Morgan" }, ...records])}/>}/><Toolbar placeholder="Search items, rooms, found locations, or storage locations…"/><Card><div className="divide-y divide-slate-100">{records.map((record) => <button key={record.title} onClick={() => setSelectedRecord(record)} className="flex w-full items-center gap-4 px-5 py-5 text-left hover:bg-slate-50 sm:px-6"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{record.title}</p><p className="mt-1 text-sm text-slate-500">{record.detail}</p></div><Badge tone={record.tone}>{record.status}</Badge><span className="text-xs font-semibold text-brand">Update</span></button>)}</div></Card><LostFoundEditor record={selectedRecord} onClose={() => setSelectedRecord(null)} onSave={(updated) => setRecords(records.map((record) => record.title === updated.title ? updated : record))} onDelete={(deleted) => setRecords(records.filter((record) => record.title !== deleted.title))}/></div>;
}

function GenericPage({ title, description, module }: { title: string; description: string; module: string }) { const records = genericRecords(module); return <div className="space-y-6"><PageHeading eyebrow="Ottawa Downtown" title={title} description={description} actions={<EntryDialog title={`Add ${title.toLowerCase()}`} submitLabel="Save" fields={["Title or description", "Details", "Priority", "Assigned department"]}/>}/><Toolbar placeholder={`Search ${title.toLowerCase()}…`}/><Card>{records.length ? <div className="divide-y divide-slate-100">{records.map((r) => <article key={r.title} className="flex items-center gap-4 px-5 py-5 sm:px-6"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{r.title}</p><p className="mt-1 text-sm text-slate-500">{r.detail}</p></div><Badge tone={r.tone}>{r.status}</Badge></article>)}</div> : <div className="grid min-h-72 place-items-center p-8 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><Archive className="size-5"/></span><h2 className="mt-4 font-semibold text-slate-900">Nothing here yet</h2><p className="mt-1 text-sm text-slate-500">New records will appear here when they’re added.</p></div></div>}</Card></div>; }

function EntryDialog({ title, submitLabel, fields, onAdd }: { title: string; submitLabel: string; fields: string[]; onAdd?: (value: string) => void }) { const [open, setOpen] = useState(false); const [saved, setSaved] = useState(false); function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const form = new FormData(e.currentTarget); onAdd?.(String(form.get("field-0") || title)); setSaved(true); setTimeout(() => { setSaved(false); setOpen(false); }, 650); } return <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><Button><Plus className="size-4"/>{title}</Button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm"/><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><Dialog.Title className="text-xl font-bold tracking-tight text-slate-950">{title}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">Complete the details below. Required fields are marked.</Dialog.Description></div><Dialog.Close className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-5"/></Dialog.Close></div><form onSubmit={submit} className="mt-6 space-y-4">{fields.map((field, i) => <label key={field} className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{field}{i < 2 && <span className="text-rose-600"> *</span>}</span>{field.toLowerCase().includes("description") || field === "Message" || field.includes("Details") ? <textarea name={`field-${i}`} required={i < 2} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-brand" placeholder={`Enter ${field.toLowerCase()}`}/> : field.includes("date") ? <input name={`field-${i}`} type="date" required={i < 2} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand"/> : <input name={`field-${i}`} required={i < 2} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand" placeholder={`Enter ${field.toLowerCase()}`}/>}</label>)}<div className="flex justify-end gap-3 pt-2"><Dialog.Close asChild><Button type="button" variant="secondary">Cancel</Button></Dialog.Close><Button type="submit">{saved ? <><Check className="size-4"/>Saved</> : submitLabel}</Button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>; }

function FormSelect({ label, value }: { label: string; value: string }) { return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><button className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 px-3 text-left text-sm text-slate-600"><span>{value}</span><ChevronDown className="size-4 text-slate-400"/></button></label>; }
function genericRecords(module: string): Array<{ title: string; detail: string; status: string; tone: "neutral" | "info" | "success" | "warning" | "urgent" }> { if (module === "incidents") return [{ title: "INC-210 · Guest follow-up", detail: "Room 412 · Assigned to Front Desk", status: "Open", tone: "info" }, { title: "INC-209 · Guest relocation after AC issue", detail: "Room 604 · Assigned to Management", status: "Awaiting review", tone: "warning" }, { title: "INC-208 · Slip near pool entrance", detail: "Pool corridor · Assigned to Maintenance", status: "In Progress", tone: "warning" }]; if (module === "lost-found") return [{ title: "Black leather wallet", detail: "Found in Maple Room · Stored in safe B-12", status: "Guest contacted", tone: "info" }, { title: "Blue children’s backpack", detail: "Found in lobby · Stored in cabinet L-04", status: "Pickup arranged", tone: "success" }]; if (module === "payment-issues") return [{ title: "OTA virtual card difference · Room 521", detail: "$184.50 · Assigned to Management", status: "In review", tone: "warning" }, { title: "Tax exemption adjustment · Room 214", detail: "$42.17 · Assigned to Front Desk", status: "Assigned", tone: "info" }]; if (module === "properties") return [{ title: "Ottawa Downtown", detail: "142 rooms · America/Toronto", status: "Active", tone: "success" }, { title: "Ottawa Airport", detail: "118 rooms · America/Toronto", status: "Active", tone: "success" }]; if (module === "people") return [{ title: "Alex Morgan", detail: "Front Desk · Ottawa Downtown", status: "Active", tone: "success" }, { title: "Jordan Lee", detail: "Maintenance · Ottawa Downtown", status: "Active", tone: "success" }, { title: "Priya Shah", detail: "Housekeeping · Ottawa Downtown", status: "Temporary password", tone: "warning" }]; return []; }
