"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, ArrowRight, BellRing, BookPlus, ClipboardPlus, Clock3, FilePlus2, PackagePlus, ShieldPlus, UserPlus, Wrench } from "lucide-react";
import { isInformationalRoomChange, useRoomUpdates } from "@/lib/room-update-store";
import { addServiceRequest, useServiceRequests } from "@/lib/service-request-store";
import { markDepartmentNotificationRead, sendDepartmentReminder, useDepartmentNotifications } from "@/lib/notification-store";
import { useHousekeepingRooms } from "@/lib/housekeeping-room-store";
import { HousekeepingRoomIssueDialog, HousekeepingSosDialog, SupervisorAssistanceDialog, type HousekeepingRoomIssueDraft, type HousekeepingSosDraft, type SupervisorAssistanceDraft } from "../record-dialogs";
import { Badge } from "../ui/badge";
import { Card, CardHeader } from "../ui/card";
import { ListRows, OperationsPreview, PageHeading, QuickActions } from "./shared";
import { useWorkOrders } from "@/lib/work-order-store";
import type { AuthenticatedViewer } from "@/lib/auth/viewer";
import type { Permission } from "@/lib/permissions";
import { getDepartmentLabel, useDepartments } from "@/lib/department-store";
import { Button } from "../ui/button";
import { X } from "lucide-react";
import type { UserAccount } from "@/lib/user-account-store";
import { useIncidents } from "@/lib/incident-store";
import { useDepartmentScores } from "@/lib/department-score-store";

export function FrontDeskDashboard({ viewer }: { viewer?: AuthenticatedViewer | null }) {
  const requests = useServiceRequests();
  const openStatuses = new Set(["Open", "Assigned", "In Progress", "Waiting"]);
  const needsAttention = requests.filter((request) => request.assigned === "Front Desk" && openStatuses.has(request.status));
  const myOpenItems = requests.filter((request) => (request.createdBy === viewer?.name || request.from === "Front Desk") && openStatuses.has(request.status));
  return <div className="space-y-6"><PageHeading eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} title={`Good morning, ${viewer?.name.split(" ")[0] ?? "team member"}`} description={`Front Desk · ${viewer?.properties[0]?.name ?? "Assigned property"}. Here’s what needs your attention today.`} actions={<DepartmentQualityScore department="Front Desk" property={viewer?.properties[0]?.name}/>}/><QuickActions items={[{ label: "Create Service Request", icon: ClipboardPlus, primary: true, href: "/app/front-desk/service-requests?create=1" }, { label: "Add Late Checkout", icon: Clock3, href: "/app/front-desk/room-updates?create=1" }, { label: "Report Incident", icon: ShieldPlus, href: "/app/front-desk/incidents?create=1" }, { label: "Add Operations Log", icon: BookPlus, href: "/app/front-desk/operations-log?create=1" }, { label: "Add Lost & Found Item", icon: PackagePlus, href: "/app/front-desk/lost-found?create=1" }]}/>
    <RoomChangeSummary workspace="front-desk"/>
    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><Card><CardHeader title="Needs attention" description="Live work currently assigned to Front Desk"/>{needsAttention.length ? <ListRows rows={needsAttention.map((request) => ({ title: `${request.id} · ${request.title}`, detail: `${request.location} · Requested by ${request.from}`, badge: request.status, tone: request.priority === "Urgent" ? "urgent" : request.status === "In Progress" ? "info" : "warning", href: `/app/front-desk/service-requests?request=${request.id}` }))}/> : <DashboardEmpty message="No Front Desk actions need attention."/>}</Card><Card><CardHeader title="My open items" description="Live status of requests you created"/>{myOpenItems.length ? <ListRows rows={myOpenItems.map((request) => ({ title: `${request.id} · ${request.title}`, detail: `${request.location} · Assigned to ${request.assigned}`, badge: request.status, tone: request.status === "In Progress" ? "info" : request.status === "Waiting" ? "warning" : "neutral", href: `/app/front-desk/service-requests?request=${request.id}` }))}/> : <DashboardEmpty message="You have no open items."/>}</Card></div>
    <OperationsPreview base="/app/front-desk" role="front-desk"/></div>;
}

export function HousekeepingDashboard({ viewer }: { viewer?: AuthenticatedViewer | null }) {
  const updates = useRoomUpdates();
  const requests = useServiceRequests();
  const assignments = useHousekeepingRooms();
  const employee = viewer;
  const [alertMessage, setAlertMessage] = useState("");
  const personalAssignments = assignments.filter((assignment) => assignment.assignedTo === employee?.name);
  const supervisorIssues = requests.filter((request) => request.assigned === "Housekeeping" && request.from === "Housekeeping" && request.status !== "Completed" && request.status !== "Cancelled");
  function reportRoomIssue(draft: HousekeepingRoomIssueDraft) {
    const id = `HK-${Date.now()}`;
    addServiceRequest({ id, title: draft.issue, description: draft.description, location: `Room ${draft.room}`, from: "Housekeeping", assigned: "Housekeeping", assignedUser: "Unassigned", priority: draft.urgency, status: "Open", due: "Today", createdAt: Date.now(), createdBy: employee?.name ?? "Housekeeping employee" });
    sendDepartmentReminder({ department: "Housekeeping", title: `Room ${draft.room}: ${draft.issue}`, message: draft.description, serviceRequestId: id, createdBy: employee?.name ?? "Housekeeping employee", audience: "SUPERVISORS", tone: draft.urgency === "Urgent" ? "urgent" : "warning", kind: "ROOM_ISSUE" });
    setAlertMessage("Room issue sent to your supervisor.");
  }
  function sendSos(draft: HousekeepingSosDraft) {
    const id = `SOS-${Date.now()}`;
    const attendant = employee?.name ?? "A Housekeeping employee";
    const detail = draft.note.trim() ? ` ${draft.note.trim()}` : "";
    sendDepartmentReminder({ department: "Housekeeping", title: `${attendant} needs help`, message: `SOS at ${draft.location}.${detail}`, serviceRequestId: id, href: "/app/housekeeping", createdBy: attendant, audience: "SUPERVISORS", tone: "urgent", kind: "SOS" });
    setAlertMessage(`Emergency SOS sent from ${draft.location}. Your supervisor has been alerted.`);
  }
  if (employee && !employee.isSupervisor) return <div className="space-y-6"><PageHeading eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} title={`Good morning, ${employee.name}`} description={`Your Housekeeping overview for ${employee.properties[0]?.name ?? "your assigned property"}.`} actions={<DepartmentQualityScore department="Housekeeping" property={employee.properties[0]?.name}/>}/>
    <HousekeepingAttendantActions locations={personalAssignments.map((assignment) => `Room ${assignment.room}`)} onReport={reportRoomIssue} onSos={sendSos}/>{alertMessage && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{alertMessage}</p>}
    <AttendantRoomSummary assignments={personalAssignments}/><AssignedRoomChanges roomNumbers={personalAssignments.map((assignment) => assignment.room)}/><OperationsPreview base="/app/housekeeping" role="housekeeping"/></div>;
  return <div className="space-y-6"><PageHeading eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} title="Housekeeping" description={`Good morning, ${employee?.name ?? "team member"}. Department assignments and supervisor follow-up for ${employee?.properties[0]?.name ?? "your assigned property"}.`} actions={<DepartmentQualityScore department="Housekeeping" property={employee?.properties[0]?.name}/>}/><QuickActions items={[{ label: "Assign Rooms", icon: ClipboardPlus, primary: true, href: "/app/housekeeping/assigned-rooms" }, { label: "Service Requests", icon: ClipboardPlus, href: "/app/housekeeping/service-requests" }, { label: "Reported Room Issues", icon: AlertTriangle, href: "/app/housekeeping/service-requests#reported-room-issues" }, { label: "Add Operations Log", icon: BookPlus, href: "/app/housekeeping/operations-log?create=1" }]}/>
    <DepartmentReminders department="Housekeeping" base="/app/housekeeping"/><RoomChangeSummary workspace="housekeeping"/>
    <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]"><Card><CardHeader title="Reported room issues" description="Issues sent by Housekeeping employees for assignment"/>{supervisorIssues.length ? <ListRows rows={supervisorIssues.map((request) => ({ title: `${request.location} · ${request.title}`, detail: `${request.createdBy ?? "Housekeeping employee"} · ${request.description ?? "Review required"}`, badge: request.assignedUser === "Unassigned" ? "Needs assignment" : request.status, tone: request.priority === "Urgent" ? "urgent" : "warning", href: `/app/housekeeping/service-requests?request=${request.id}` }))}/> : <DashboardEmpty message="No employee-reported room issues need review."/>}</Card><Card className="h-fit"><CardHeader title="Today’s room board" action={<Link href="/app/housekeeping/assigned-rooms" className="text-xs font-semibold text-brand">Manage assignments</Link>}/><div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-2xl bg-slate-100"><Metric label="Assigned" value={String(assignments.filter((room) => room.assignedTo !== "Unassigned").length)}/><Metric label="Priority" value={String(assignments.filter((room) => room.priority === "Priority").length)}/><Metric label="Ready" value={String(assignments.filter((room) => room.status === "Ready to inspect").length)}/><Metric label="Waiting" value={String(assignments.filter((room) => room.status === "Waiting").length)}/></div></Card></div><OperationsPreview base="/app/housekeeping" role="housekeeping"/></div>;
}

function HousekeepingAttendantActions({ locations, onReport, onSos }: { locations: string[]; onReport: (draft: HousekeepingRoomIssueDraft) => void; onSos: (draft: HousekeepingSosDraft) => void }) {
  return <section aria-labelledby="attendant-actions"><h2 id="attendant-actions" className="sr-only">Quick actions</h2><div className="grid gap-3 sm:grid-cols-3"><div className="[&>button]:min-h-[76px] [&>button]:w-full [&>button]:justify-start [&>button]:rounded-2xl [&>button]:px-4"><HousekeepingRoomIssueDialog onCreate={onReport}/></div><Link href="/app/housekeeping/operations-log?create=1" className="group flex min-h-[76px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 shadow-soft"><span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><BookPlus className="size-[19px]"/></span>Add Operations Log<ArrowRight className="ml-auto size-4 text-slate-300"/></Link><div className="[&>button]:min-h-[76px] [&>button]:w-full [&>button]:justify-start [&>button]:rounded-2xl [&>button]:border-amber-300 [&>button]:bg-amber-50 [&>button]:px-4 [&>button]:text-amber-950 [&>button]:shadow-soft [&>button:hover]:bg-amber-100"><HousekeepingSosDialog locations={locations} onSend={onSos}/></div></div></section>;
}

function AttendantRoomSummary({ assignments }: { assignments: ReturnType<typeof useHousekeepingRooms> }) {
  const inProgress = assignments.filter((room) => room.status === "In Progress").length;
  const ready = assignments.filter((room) => room.status === "Ready to inspect").length;
  return <Card className="overflow-hidden"><CardHeader title="Today at a glance" description="Live totals for your shift" action={<Link href="/app/housekeeping/assigned-rooms" className="text-xs font-semibold text-brand">Open room board</Link>}/><div className="grid grid-cols-3 gap-px bg-slate-100"><div aria-label={`${assignments.length} ${assignments.length === 1 ? "room" : "rooms"} assigned to you`}><Metric label="My assigned rooms" value={String(assignments.length)}/></div><div aria-label={`${inProgress} assigned rooms in progress`}><Metric label="In progress" value={String(inProgress)}/></div><div aria-label={`${ready} assigned rooms ready to inspect`}><Metric label="Ready to inspect" value={String(ready)}/></div></div></Card>;
}

function AssignedRoomChanges({ roomNumbers }: { roomNumbers: string[] }) {
  const updates = useRoomUpdates().filter((update) => roomNumbers.includes(update.room) && isInformationalRoomChange(update));
  if (!updates.length) return null;
  return <Card><CardHeader title="Changes affecting my rooms" description="Information only · removed automatically at 6:00 PM"/><div className="divide-y divide-slate-100">{updates.map((update, index) => <div key={update.id ?? `${update.room}-${update.type}-${index}`} className="flex min-h-[68px] items-center gap-3 px-5 py-3 sm:px-6"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-sm font-bold text-brand-strong">{update.room}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">Room {update.room} · {update.type}</p><p className="mt-1 text-xs text-slate-500">No action required</p></div><Badge tone="info">Information</Badge></div>)}</div></Card>;
}

export function MaintenanceDashboard({ viewer }: { viewer?: AuthenticatedViewer | null }) {
  const workOrders = useWorkOrders();
  const employee = viewer ?? { name: "Current user", isSupervisor: false, properties: [] };
  const [alertMessage, setAlertMessage] = useState("");
  const isSupervisor = Boolean(employee.isSupervisor);
  const visibleWork = isSupervisor ? workOrders : workOrders.filter((order) => order.assignee === employee.name);
  const priorityWork = visibleWork.filter((order) => order.status !== "Completed" && order.status !== "Cancelled" && (order.priority === "Urgent" || order.priority === "High"));
  const personalCounts = {
    assigned: visibleWork.filter((order) => order.status === "Open" || order.status === "Assigned").length,
    inProgress: visibleWork.filter((order) => order.status === "In Progress").length,
    waiting: visibleWork.filter((order) => order.status === "Waiting").length,
    completed: visibleWork.filter((order) => order.status === "Completed").length,
  };
  const quickActions = [{ label: "Create Work Order", icon: Wrench, primary: true, href: "/app/maintenance/work-orders?create=1" }, { label: "Schedule Preventive", icon: Clock3, href: "/app/maintenance/preventive" }, { label: "View Reports", icon: FilePlus2, href: "/app/maintenance/maintenance-reports" }, { label: "Add Operations Log", icon: BookPlus, href: "/app/maintenance/operations-log?create=1" }];
  const assignedLocations = visibleWork.filter((order) => order.status !== "Completed" && order.status !== "Cancelled").map((order) => order.location);
  function notifySupervisor(draft: SupervisorAssistanceDraft, urgent: boolean) {
    const id = `${urgent ? "SOS" : "SUPPORT"}-${Date.now()}`;
    const detail = draft.note.trim() ? ` ${draft.note.trim()}` : "";
    sendDepartmentReminder({ department: "Maintenance", title: urgent ? `${employee.name} needs emergency help` : `${employee.name} requested support`, message: `${urgent ? "SOS" : "Support requested"} at ${draft.location}.${detail}`, serviceRequestId: id, href: "/app/maintenance", createdBy: employee.name, audience: "SUPERVISORS", tone: urgent ? "urgent" : "info", kind: urgent ? "SOS" : "SUPPORT" });
    setAlertMessage(`${urgent ? "Emergency SOS" : "Support request"} sent from ${draft.location}. Your supervisor has been alerted.`);
  }
  return <div className="space-y-6">
    <PageHeading eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} title={isSupervisor ? "Maintenance" : `Good morning, ${employee.name}`} description={isSupervisor ? `Good morning, ${employee.name}. Department assignments and property maintenance for ${employee.properties[0]?.name ?? "your assigned property"}.` : `Your assigned Maintenance work for ${employee.properties[0]?.name ?? "your assigned property"}.`} actions={<DepartmentQualityScore department="Maintenance" property={employee.properties[0]?.name}/>}/>{isSupervisor ? <QuickActions items={quickActions}/> : <MaintenanceTechnicianActions locations={assignedLocations} onAlert={notifySupervisor}/>} 
    {alertMessage && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{alertMessage}</p>}
    {isSupervisor && <DepartmentReminders department="Maintenance" base="/app/maintenance"/>}
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><Card><CardHeader title="Priority work" description={isSupervisor ? "Urgent and high-priority Maintenance work only" : "Urgent and high-priority work assigned to you"}/><div className="divide-y divide-slate-100">{priorityWork.map((order) => <Link href={`/app/maintenance/work-orders?request=${order.id}`} key={order.id} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 sm:px-6"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${order.priority === "Urgent" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}><Wrench className="size-4"/></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{order.id} · {order.title}</p><p className="mt-1 text-sm text-slate-500">{order.location} · {order.assignee}</p></div><Badge tone={order.priority === "Urgent" ? "urgent" : "warning"}>{order.status}</Badge><span className="hidden text-xs text-slate-400 sm:block">{order.age}</span></Link>)}{priorityWork.length === 0 && <DashboardEmpty message="No urgent or high-priority Maintenance work."/>}</div></Card>{isSupervisor ? <Card className="h-fit"><CardHeader title="Department workload"/><ListRows rows={[{ title: "Preventive maintenance due", detail: "5 inspections due this week", badge: "5", tone: "warning" }, { title: "Recurring room issues", detail: "3 rooms with repeat reports", badge: "Review", tone: "urgent" }, { title: "Waiting for parts", detail: "2 work orders paused", badge: "2", tone: "neutral" }]}/></Card> : <Card className="h-fit overflow-hidden"><CardHeader title="My work summary" description="Only work assigned to you"/><div className="grid grid-cols-2 gap-px bg-slate-100"><Metric label="Assigned" value={String(personalCounts.assigned)}/><Metric label="In progress" value={String(personalCounts.inProgress)}/><Metric label="Waiting" value={String(personalCounts.waiting)}/><Metric label="Completed" value={String(personalCounts.completed)}/></div></Card>}</div><OperationsPreview base="/app/maintenance" role="maintenance"/></div>;
}

function MaintenanceTechnicianActions({ locations, onAlert }: { locations: string[]; onAlert: (draft: SupervisorAssistanceDraft, urgent: boolean) => void }) {
  const dialogClass = "[&>button]:min-h-[76px] [&>button]:w-full [&>button]:justify-start [&>button]:rounded-2xl [&>button]:px-4 [&>button]:shadow-soft";
  return <section aria-labelledby="maintenance-technician-actions"><h2 id="maintenance-technician-actions" className="sr-only">Quick actions</h2><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Link href="/app/maintenance/work-orders" className="group flex min-h-[76px] items-center gap-3 rounded-2xl border border-brand bg-brand p-4 text-sm font-semibold text-white shadow-soft"><span className="grid size-10 place-items-center rounded-xl bg-white/15"><Wrench className="size-[19px]"/></span>My Work Orders<ArrowRight className="ml-auto hidden size-4 text-brand-border sm:block"/></Link><div className={`${dialogClass} [&>button]:border-amber-300 [&>button]:bg-amber-50 [&>button]:text-amber-950 [&>button:hover]:bg-amber-100`}><SupervisorAssistanceDialog department="Maintenance" locations={locations} urgent onSend={(draft) => onAlert(draft, true)}/></div><div className={`${dialogClass} [&>button]:border-sky-200 [&>button]:bg-sky-50 [&>button]:text-sky-950 [&>button:hover]:bg-sky-100`}><SupervisorAssistanceDialog department="Maintenance" locations={locations} onSend={(draft) => onAlert(draft, false)}/></div><Link href="/app/maintenance/operations-log?create=1" className="group flex min-h-[76px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 shadow-soft"><span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><BookPlus className="size-[19px]"/></span>Add Operations Log<ArrowRight className="ml-auto hidden size-4 text-slate-300 sm:block"/></Link></div></section>;
}

function SupervisorCallControl() {
  const departments = useDepartments();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("all");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/management/users", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { users?: UserAccount[] };
      setAccounts(result.users ?? []);
    }).catch(() => undefined);
  }, []);
  const supervisors = accounts.filter((account) => account.workspace !== "manager" && (account.isSupervisor || /supervisor/i.test(account.title)));
  function callSupervisors(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targets = target === "all" ? supervisors : supervisors.filter((supervisor) => supervisor.id === target);
    targets.forEach((supervisor) => sendDepartmentReminder({ department: getDepartmentLabel(supervisor.workspace, departments), recipientName: supervisor.name, title: "Please report to the General Manager’s office", message: note.trim() || "The General Manager is requesting your presence in the office.", serviceRequestId: `manager-call-${Date.now()}-${supervisor.id}`, href: `/app/${supervisor.workspace}`, createdBy: "General Manager", audience: "SUPERVISORS", tone: "urgent", kind: "MANAGER_CALL" }));
    setMessage(target === "all" ? `Called all ${targets.length} supervisors.` : `Called ${targets[0]?.name ?? "the selected supervisor"}.`);
    setNote("");
    setOpen(false);
  }
  return <div><Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><Button type="button"><BellRing className="size-4"/>Call supervisors</Button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm"/><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-xl font-bold text-slate-950">Call supervisors to the office</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">Notify one supervisor separately or every supervisor together.</Dialog.Description></div><Dialog.Close className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-5"/></Dialog.Close></div><form className="mt-6 space-y-4" onSubmit={callSupervisors}><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Who should be called?</span><select aria-label="Supervisor call recipients" value={target} onChange={(event) => setTarget(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">All supervisors together</option>{supervisors.map((supervisor) => <option key={supervisor.id} value={supervisor.id}>{supervisor.name} · {getDepartmentLabel(supervisor.workspace, departments)}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Message</span><textarea aria-label="Supervisor call message" value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Optional reason or instruction"/></label><div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><Dialog.Close asChild><Button type="button" variant="secondary">Cancel</Button></Dialog.Close><Button type="submit" disabled={!supervisors.length}><BellRing className="size-4"/>Send call</Button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>{message && <span className="mt-2 block text-xs font-semibold text-emerald-700" role="status">{message}</span>}</div>;
}

export function ManagerDashboard({ viewer = null }: { viewer?: AuthenticatedViewer | null }) {
  const requests = useServiceRequests();
  const workOrders = useWorkOrders();
  const incidents = useIncidents();
  const scores = useDepartmentScores();
  const actions: Array<{ label: string; icon: typeof BookPlus; primary?: boolean; href: string; permission: Permission }> = [{ label: "Create Announcement", icon: BookPlus, primary: true, href: "/app/manager/operations-log?create=1", permission: "CREATE_OPERATION_LOG" }, { label: "Assign Task", icon: ClipboardPlus, href: "/app/manager/service-requests?create=1", permission: "ASSIGN_SERVICE_REQUEST" }, { label: "View Reports", icon: FilePlus2, href: "/app/manager/reports", permission: "VIEW_REPORTS" }, { label: "Manage Users", icon: UserPlus, href: "/app/manager/people", permission: "MANAGE_USERS" }];
  const propertyName = viewer?.properties[0]?.name ?? "your assigned property";
  const openStatuses = new Set(["Open", "Assigned", "In Progress", "Waiting"]);
  const openCount = requests.filter((item) => openStatuses.has(item.status)).length + workOrders.filter((item) => openStatuses.has(item.status)).length + incidents.filter((item) => openStatuses.has(item.status)).length;
  const urgentCount = requests.filter((item) => item.priority === "Urgent" && openStatuses.has(item.status)).length + workOrders.filter((item) => item.priority === "Urgent" && openStatuses.has(item.status)).length + incidents.filter((item) => item.tone === "urgent" && openStatuses.has(item.status)).length;
  const completedCount = requests.filter((item) => item.status === "Completed").length + workOrders.filter((item) => item.status === "Completed").length + incidents.filter((item) => item.status === "Completed" || item.status === "Closed").length;
  const qualityRows = scores.map((score) => ({ title: score.department, detail: `Updated ${score.reviewDate}`, badge: `${score.score}%`, tone: score.score >= score.target ? "success" as const : "warning" as const }));
  const escalationRows = incidents.filter((incident) => incident.tone === "urgent" && openStatuses.has(incident.status)).slice(0, 5).map((incident) => ({ title: incident.title, detail: `${incident.location || "Property"} · ${incident.assignedDepartment}`, badge: incident.status, tone: "urgent" as const, href: `/app/manager/incidents?request=${incident.id}` }));
  return <div className="space-y-6"><PageHeading eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} title={`Good morning, ${viewer?.name.split(" ")[0] ?? "General Manager"}`} description={`Property-wide management overview for ${propertyName}.`} actions={<SupervisorCallControl/>}/><QuickActions items={actions.filter((action) => !viewer || viewer.permissions.includes(action.permission))}/>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Summary label="Open issues" value={String(openCount)} note="Across authorized departments"/><Summary label="Urgent" value={String(urgentCount)} note="Needs prompt attention" urgent/><Summary label="Incidents" value={String(incidents.filter((item) => openStatuses.has(item.status)).length)} note="Currently open"/><Summary label="Completed" value={String(completedCount)} note="Records currently completed" success/></div>
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><OperationsPreview base="/app/manager" role="manager"/><Card><CardHeader title="Department quality" description="Current database scores"/>{qualityRows.length ? <ListRows rows={qualityRows}/> : <DashboardEmpty message="No department scores have been added."/>}</Card></div>
    <Card><CardHeader title="Recent escalations" description="Urgent incidents that need management visibility"/>{escalationRows.length ? <ListRows rows={escalationRows}/> : <DashboardEmpty message="No urgent incident escalations."/>}</Card></div>;
}

export function FoodBeverageDashboard({ viewer }: { viewer?: AuthenticatedViewer | null }) {
  return <div className="space-y-6"><PageHeading eyebrow="Food & Beverage" title="Good morning" description="Share department updates and report operational incidents." actions={<DepartmentQualityScore department="Food & Beverage" property={viewer?.properties[0]?.name}/>}/><QuickActions items={[{ label: "Add Operations Log", icon: BookPlus, primary: true, href: "/app/food-beverage/operations-log?create=1" }, { label: "Report Incident", icon: ShieldPlus, href: "/app/food-beverage/incidents?create=1" }]}/><OperationsPreview base="/app/food-beverage" role="food-beverage"/></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="bg-white p-5"><p className="text-2xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs font-medium text-slate-500">{label}</p></div>; }
function DashboardEmpty({ message }: { message: string }) { return <div className="px-5 py-8 text-center text-sm text-slate-500 sm:px-6">{message}</div>; }
function Summary({ label, value, note, urgent, success }: { label: string; value: string; note: string; urgent?: boolean; success?: boolean }) { return <Card className="p-4 sm:p-5"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${urgent ? "bg-rose-500" : success ? "bg-emerald-500" : "bg-brand"}`} aria-hidden="true"/><p className="text-xs font-semibold text-slate-500">{label}</p></div><p className="mt-3 text-3xl font-bold tracking-[-.04em] text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p></Card>; }
function DepartmentQualityScore({ department, property }: { department: string; property?: string }) { const scores = useDepartmentScores(); const current = scores.find((score) => score.department === department && (!property || score.property === property)); return current ? <CompactQualityScore department={department} score={current.score} target={current.target}/> : null; }
function CompactQualityScore({ department, score, target }: { department: string; score: number; target: number }) { const meetsTarget = score >= target; const color = meetsTarget ? "#10b981" : "#f59e0b"; return <div className={`flex items-center gap-3 self-start rounded-2xl border bg-white px-3 py-2 shadow-soft ${meetsTarget ? "border-emerald-200" : "border-amber-300"}`} aria-label={`${department} department score ${score} percent, target ${target} percent`}><div className="relative grid size-14 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #e2e8f0 0deg)` }}><span className={`grid size-[46px] place-items-center rounded-full bg-white text-sm font-bold ${meetsTarget ? "text-emerald-800" : "text-amber-800"}`}>{score}%</span></div><div className="pr-1"><p className="text-xs font-semibold text-slate-800">Department score</p><p className={`mt-0.5 text-[11px] font-semibold ${meetsTarget ? "text-emerald-700" : "text-amber-700"}`}>{meetsTarget ? `Target ${target}% met` : `Below target of ${target}%`}</p></div></div>; }
function DepartmentReminders({ department, base }: { department: "Housekeeping" | "Maintenance"; base: string }) {
  const notifications = useDepartmentNotifications(department).filter((notification) => !notification.readAt);
  if (!notifications.length) return null;
  const urgent = notifications.some((notification) => notification.tone === "urgent");
  return <Card className={urgent ? "border-amber-300 bg-amber-50/80" : "border-sky-200 bg-sky-50/70"}><CardHeader title={urgent ? "Supervisor alerts" : "Department notifications"} description={`New follow-up notifications for ${department}`}/><div className={urgent ? "divide-y divide-amber-200" : "divide-y divide-sky-100"}>{notifications.slice(0, 3).map((notification) => {
    const needsAcknowledgement = notification.kind === "SOS" || notification.kind === "SUPPORT";
    const content = <><span className={`grid size-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm ${notification.tone === "urgent" ? "text-amber-800" : "text-sky-700"}`}><BellRing className="size-4"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{notification.title}</span><span className="mt-1 block text-sm text-slate-600">{notification.message}</span></span><Badge tone={notification.tone === "urgent" ? "warning" : "info"}>{needsAcknowledgement ? "Acknowledge" : "Notice"}</Badge></>;
    const className = `flex min-h-[72px] w-full items-center gap-3 px-5 py-3 text-left sm:px-6 ${notification.tone === "urgent" ? "hover:bg-amber-100/70" : "hover:bg-sky-50"}`;
    return needsAcknowledgement ? <button key={notification.id} type="button" onClick={() => markDepartmentNotificationRead(notification.id)} aria-label={`Acknowledge ${notification.kind === "SOS" ? "SOS" : "support request"} from ${notification.createdBy}`} className={className}>{content}</button> : <Link key={notification.id} href={notification.href ?? `${base}/service-requests?request=${notification.serviceRequestId}`} onClick={() => markDepartmentNotificationRead(notification.id)} className={className}>{content}</Link>;
  })}</div></Card>;
}
function RoomChangeSummary({ workspace, roomNumbers }: { workspace: "front-desk" | "housekeeping"; roomNumbers?: string[] }) {
  const updates = useRoomUpdates();
  const visibleUpdates = roomNumbers ? updates.filter((update) => roomNumbers.includes(update.room)) : updates;
  const lateCheckouts = visibleUpdates.filter((update) => update.type === "Late checkout");
  const earlyCheckouts = visibleUpdates.filter((update) => update.type === "Early checkout");
  const stayovers = visibleUpdates.filter((update) => update.type.toLowerCase().includes("stayover") || update.type.toLowerCase().includes("extension"));
  const lateByTime = lateCheckouts.reduce<Record<string, number>>((groups, update) => {
    const newTime = update.detail.match(/to (.+?)(?:\.|$)/)?.[1] ?? "Time pending";
    groups[newTime] = (groups[newTime] ?? 0) + 1;
    return groups;
  }, {});
  if (lateCheckouts.length === 0 && earlyCheckouts.length === 0 && stayovers.length === 0) return null;
  return <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 sm:px-6"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand"><Clock3 className="size-4"/></span><div><h2 className="text-sm font-semibold text-slate-900">Today’s room changes</h2><p className="text-xs text-slate-400">Information only · removed at 6:00 PM</p></div></div><Link href={`/app/${workspace}/room-updates`} className="text-xs font-semibold text-brand hover:text-brand-strong">View details</Link></div><div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">{lateCheckouts.length > 0 && <section className="flex items-center gap-4 px-5 py-4 sm:px-6" aria-label={`${lateCheckouts.length} late ${lateCheckouts.length === 1 ? "checkout" : "checkouts"}`}><div className="grid size-12 shrink-0 place-items-center rounded-full bg-amber-50 text-xl font-bold text-amber-800">{lateCheckouts.length}</div><div><h3 className="text-sm font-semibold text-slate-900">Late checkouts</h3><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{Object.entries(lateByTime).map(([time, count]) => <span key={time} className="text-xs text-slate-500"><strong className="font-semibold text-slate-700">{count}</strong> at {time}</span>)}</div></div></section>}{earlyCheckouts.length > 0 && <section className="flex items-center gap-4 px-5 py-4 sm:px-6" aria-label={`${earlyCheckouts.length} early ${earlyCheckouts.length === 1 ? "checkout" : "checkouts"}`}><div className="grid size-12 shrink-0 place-items-center rounded-full bg-sky-50 text-xl font-bold text-sky-800">{earlyCheckouts.length}</div><div><h3 className="text-sm font-semibold text-slate-900">Early checkouts</h3><p className="mt-1 text-xs text-slate-500">{earlyCheckouts.length} {earlyCheckouts.length === 1 ? "room" : "rooms"}</p></div></section>}{stayovers.length > 0 && <section className="flex items-center gap-4 px-5 py-4 sm:px-6" aria-label={`${stayovers.length} ${stayovers.length === 1 ? "stayover room" : "stayover rooms"}`}><div className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-50 text-xl font-bold text-emerald-700">{stayovers.length}</div><div><h3 className="text-sm font-semibold text-slate-900">Stayovers</h3><p className="mt-1 text-xs text-slate-500">{stayovers.length === 1 ? "1 room changed to stayover" : `${stayovers.length} rooms changed to stayover`}</p></div></section>}</div></Card>;
}
