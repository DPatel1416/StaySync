"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpenText, Building2, ChevronDown, CircleGauge, ClipboardList, FileChartColumn, HelpCircle, Home, LogOut, Menu, PackageSearch, Settings, ShieldAlert, Star, Users, Wrench, X } from "lucide-react";
import { Logo } from "./logo";
import { cn, initials } from "@/lib/utils";
import { workspaceNames } from "@/lib/demo-data";
import type { WorkspaceRole } from "@/lib/permissions";

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

const users: Record<WorkspaceRole, { name: string; title: string }> = {
  "front-desk": { name: "Alex Morgan", title: "Guest Services Agent" },
  housekeeping: { name: "Priya Shah", title: "Room Attendant" },
  maintenance: { name: "Jordan Lee", title: "Maintenance Technician" },
  manager: { name: "Maya Chen", title: "Operations Manager" },
};

export function AppShell({ role, children }: { role: WorkspaceRole; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const user = users[role];
  const base = `/app/${role}`;
  const sidebar = <>
    <div className="flex h-[76px] items-center justify-between px-5"><Logo/><button className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><X className="size-5"/></button></div>
    <div className="mx-3 mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3"><button className="flex w-full items-center gap-3 text-left" aria-label="Current property: Ottawa Downtown"><span className="grid size-9 place-items-center rounded-lg bg-white text-indigo-600 shadow-sm"><Building2 className="size-4"/></span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-slate-900">Ottawa Downtown</span><span className="block text-xs text-slate-500">Northstar Hotels</span></span><ChevronDown className="size-4 text-slate-400"/></button></div>
    <nav className="flex-1 space-y-1 px-3" aria-label="Primary navigation">{nav[role].map(([label, path, Icon]) => { const href = path ? `${base}/${path}` : base; const active = pathname === href; return <Link onClick={() => setOpen(false)} key={label} href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition", active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950")}><Icon className="size-[18px]"/><span>{label}</span></Link>; })}</nav>
    <div className="space-y-1 border-t border-slate-100 p-3"><Link href={`${base}/settings`} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-slate-500 hover:bg-slate-50"><Settings className="size-[18px]"/>Settings</Link><a href="#" className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-slate-500 hover:bg-slate-50"><HelpCircle className="size-[18px]"/>Help & support</a></div>
    <div className="border-t border-slate-100 p-3"><div className="flex items-center gap-3 rounded-xl p-2"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{initials(user.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{user.name}</span><span className="block truncate text-xs text-slate-500">{user.title}</span></span><Link href="/" aria-label="Sign out" className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><LogOut className="size-4"/></Link></div></div>
  </>;

  return <div className="min-h-screen bg-[#f8f8fa]">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r border-slate-200 bg-white lg:flex">{sidebar}</aside>
    {open && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" aria-label="Close navigation overlay" onClick={() => setOpen(false)}/><aside className="relative flex h-full w-[290px] flex-col bg-white shadow-2xl">{sidebar}</aside></div>}
    <div className="lg:pl-[var(--sidebar-width)]">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8"><div className="flex items-center gap-3"><button className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="size-5"/></button><div className="lg:hidden"><p className="text-sm font-semibold text-slate-900">{workspaceNames[role]}</p><p className="text-xs text-slate-500">Ottawa Downtown</p></div></div><div className="flex items-center gap-2"><span className="hidden rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 sm:block">Demo workspace</span><button className="relative grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Notifications, 3 unread"><Bell className="size-5"/><span className="absolute right-2 top-2 size-2 rounded-full bg-rose-500"><span className="sr-only">3 unread</span></span></button></div></header>
      <main className="mx-auto max-w-[1480px] p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  </div>;
}
