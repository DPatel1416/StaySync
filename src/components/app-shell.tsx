"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpenText, Building2, Check, ChevronDown, CircleGauge, ClipboardList, FileChartColumn, HelpCircle, Home, LogOut, Menu, PackageSearch, Settings, ShieldAlert, Star, Users, Wrench, X } from "lucide-react";
import { Logo } from "./logo";
import { cn, initials } from "@/lib/utils";
import { workspaceNames } from "@/lib/demo-data";
import type { WorkspaceRole } from "@/lib/permissions";
import { markDepartmentNotificationsRead, useDepartmentNotifications } from "@/lib/notification-store";
import { clearDemoEmployeeSession, getDemoEmployeeSession } from "@/lib/demo-auth";

const nav = {
  "front-desk": [
    ["Overview", "", Home], ["Operations Log", "operations-log", BookOpenText], ["Room Updates", "room-updates", CircleGauge], ["Service Requests", "service-requests", ClipboardList], ["Incidents", "incidents", ShieldAlert], ["Lost & Found", "lost-found", PackageSearch], ["Payment Issues", "payment-issues", FileChartColumn],
  ],
  housekeeping: [
    ["Overview", "", Home], ["Room Updates", "room-updates", CircleGauge], ["Assigned Rooms", "assigned-rooms", ClipboardList], ["Operations Log", "operations-log", BookOpenText], ["Service Requests", "service-requests", Wrench],
  ],
  maintenance: [
    ["Overview", "", Home], ["Work Orders", "work-orders", Wrench], ["Service Requests", "service-requests", ClipboardList], ["Preventive", "preventive", CircleGauge], ["Operations Log", "operations-log", BookOpenText],
  ],
  manager: [
    ["Overview", "", Home], ["Operations Log", "operations-log", BookOpenText], ["All Requests", "service-requests", ClipboardList], ["Incidents", "incidents", ShieldAlert], ["Quality Scores", "quality-scores", Star], ["Reports", "reports", FileChartColumn], ["People", "people", Users], ["Properties", "properties", Building2],
  ],
} satisfies Record<WorkspaceRole, Array<[string, string, typeof Home]>>;

const users: Record<WorkspaceRole, { name: string; title: string; isSupervisor?: boolean }> = {
  "front-desk": { name: "Alex Morgan", title: "Guest Services Agent" },
  housekeeping: { name: "Priya Shah", title: "Housekeeping Supervisor", isSupervisor: true },
  maintenance: { name: "Jordan Lee", title: "Maintenance Technician" },
  manager: { name: "Maya Chen", title: "Operations Manager", isSupervisor: true },
};

export function AppShell({ role, children }: { role: WorkspaceRole; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const authorizedProperties = role === "manager" ? ["Ottawa Downtown", "Ottawa Airport"] : ["Ottawa Downtown"];
  const [property, setProperty] = useState(authorizedProperties[0]);
  const pathname = usePathname();
  const [user, setUser] = useState(users[role]);
  useEffect(() => {
    const session = getDemoEmployeeSession(role);
    if (session) setUser({ name: session.name, title: session.title, isSupervisor: session.isSupervisor });
  }, [role]);
  const base = `/app/${role}`;
  const departmentNotifications = useDepartmentNotifications(workspaceNames[role], Boolean(user.isSupervisor));
  const unreadNotifications = departmentNotifications.filter((notification) => !notification.readAt);
  const sidebar = <>
    <div className="flex h-[76px] items-center justify-between px-5"><Logo/><button className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><X className="size-5"/></button></div>
    <div className="relative mx-3 mb-4 rounded-xl border border-brand-border bg-brand-soft p-3"><button type="button" onClick={() => setPropertyOpen((current) => !current)} className="flex min-h-11 w-full items-center gap-3 text-left" aria-label={`Current property: ${property}. Open property menu`} aria-expanded={propertyOpen}><span className="grid size-9 place-items-center rounded-lg bg-white text-brand shadow-sm"><Building2 className="size-4"/></span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-slate-900">{property}</span><span className="block text-xs text-slate-500">Northstar Hotels</span></span><ChevronDown className={cn("size-4 text-slate-400 transition-transform", propertyOpen && "rotate-180")}/></button>{propertyOpen && <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg" role="menu" aria-label="Authorized properties">{authorizedProperties.map((name) => <button key={name} type="button" role="menuitemradio" aria-checked={property === name} onClick={() => { setProperty(name); setPropertyOpen(false); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-slate-700 hover:bg-slate-50"><span className="min-w-0 flex-1 truncate font-medium">{name}</span>{property === name && <Check className="size-4 text-brand"/>}</button>)}{authorizedProperties.length === 1 && <p className="border-t border-slate-100 px-3 py-2 text-xs leading-5 text-slate-500">This is the only property assigned to your account.</p>}</div>}</div>
    <nav className="flex-1 space-y-1 px-3" aria-label="Primary navigation">{nav[role].map(([label, path, Icon]) => { const href = path ? `${base}/${path}` : base; const active = pathname === href; return <Link onClick={() => setOpen(false)} key={label} href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition", active ? "bg-brand-soft text-brand-strong" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950")}><Icon className="size-[18px]"/><span>{label}</span></Link>; })}</nav>
    <div className="space-y-1 border-t border-slate-100 p-3"><Link href={`${base}/settings`} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-slate-500 hover:bg-slate-50"><Settings className="size-[18px]"/>Settings</Link><a href="#" className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-slate-500 hover:bg-slate-50"><HelpCircle className="size-[18px]"/>Help & support</a></div>
    <div className="border-t border-slate-100 p-3"><div className="flex items-center gap-3 rounded-xl p-2"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-muted text-xs font-bold text-brand-strong">{initials(user.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{user.name}</span><span className="block truncate text-xs text-slate-500">{user.title}</span></span><Link href="/" onClick={clearDemoEmployeeSession} aria-label="Sign out" className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><LogOut className="size-4"/></Link></div></div>
  </>;

  return <div className="department-workspace min-h-screen" data-department-theme={role}>
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r border-t-2 border-r-slate-200 border-t-brand bg-white lg:flex">{sidebar}</aside>
    {open && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" aria-label="Close navigation overlay" onClick={() => setOpen(false)}/><aside className="relative flex h-full w-[290px] flex-col bg-white shadow-2xl">{sidebar}</aside></div>}
    <div className="lg:pl-[var(--sidebar-width)]">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-t-2 border-b-slate-200/80 border-t-brand bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8"><div className="flex items-center gap-3"><button className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="size-5"/></button><div className="lg:hidden"><p className="text-sm font-semibold text-slate-900">{workspaceNames[role]}</p><p className="text-xs text-slate-500">{property}</p></div></div><div className="relative flex items-center gap-2"><span className="hidden rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 sm:block">Demo workspace</span><button onClick={() => { const next = !notificationsOpen; setNotificationsOpen(next); if (next) markDepartmentNotificationsRead(workspaceNames[role], Boolean(user.isSupervisor)); }} className="relative grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={`Notifications, ${unreadNotifications.length} unread`} aria-expanded={notificationsOpen}><Bell className="size-5"/>{unreadNotifications.length > 0 && <span className="absolute right-1 top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white"><span className="sr-only">Unread notifications: </span>{unreadNotifications.length}</span>}</button>{notificationsOpen && <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"><div className="border-b border-slate-100 px-4 py-3"><p className="text-sm font-semibold text-slate-900">Notifications</p><p className="text-xs text-slate-500">Updates sent to {workspaceNames[role]}</p></div>{departmentNotifications.length ? <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">{departmentNotifications.map((notification) => <Link key={notification.id} href={`${base}/service-requests?request=${notification.serviceRequestId}`} onClick={() => setNotificationsOpen(false)} className="block px-4 py-3 hover:bg-slate-50"><p className="text-sm font-semibold text-slate-800">{notification.title}</p><p className="mt-1 text-sm leading-5 text-slate-500">{notification.message}</p><p className="mt-1.5 text-xs text-slate-400">Sent by {notification.createdBy}</p></Link>)}</div> : <p className="px-4 py-8 text-center text-sm text-slate-500">No department notifications yet.</p>}</div>}</div></header>
      <main className="mx-auto max-w-[1480px] p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  </div>;
}
