"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, Pin, TrendingUp } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardHeader } from "../ui/card";
import { workspaceNames } from "@/lib/workspace-labels";
import { useOperationLogs } from "@/lib/operation-log-store";
import type { WorkspaceRole } from "@/lib/permissions";

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-brand">{eyebrow}</p><h1 className="mt-1 text-3xl font-bold tracking-[-.035em] text-slate-950 sm:text-[34px]">{title}</h1><p className="mt-2 max-w-2xl text-[15px] text-slate-500">{description}</p></div>{actions}</div>;
}

export function QuickActions({ items }: { items: Array<{ label: string; icon: React.ElementType; primary?: boolean; href?: string }> }) {
  return <section aria-labelledby="quick-actions"><h2 id="quick-actions" className="sr-only">Quick actions</h2><div className={`grid grid-cols-2 gap-3 ${items.length === 2 ? "max-w-2xl lg:grid-cols-2" : items.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>{items.map(({ label, icon: Icon, primary, href }) => {
    const className = `group flex min-h-[76px] items-center gap-3 rounded-2xl border p-4 text-left text-sm font-semibold shadow-soft transition hover:-translate-y-0.5 hover:shadow-md ${primary ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-800"}`;
    const content = <><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${primary ? "bg-white/15 text-white" : "bg-brand-soft text-brand"}`}><Icon className="size-[19px]"/></span><span className="leading-5">{label}</span><ArrowRight className={`ml-auto hidden size-4 transition group-hover:translate-x-0.5 sm:block ${primary ? "text-brand-border" : "text-slate-300"}`}/></>;
    return href ? <Link key={label} href={href} className={className}>{content}</Link> : <button key={label} className={className}>{content}</button>;
  })}</div></section>;
}

export function OperationsPreview({ base, role }: { base: string; role: WorkspaceRole }) {
  const logs = useOperationLogs();
  const department = workspaceNames[role];
  const visibleLogs = role === "manager"
    ? logs
    : logs.filter((log) => log.department === department || log.sharedWith.includes(department));
  const description = role === "manager" ? "Latest updates across hotel departments" : `${department} updates and entries shared with your team`;

  return <Card><CardHeader title="Operations Log" description={description} action={<Link href={`${base}/operations-log`} className="text-sm font-semibold text-brand hover:text-brand-strong">View all</Link>}/><div className="divide-y divide-slate-100">{visibleLogs.slice(0, 3).map((log) => <article key={log.id} className="group flex gap-3 px-5 py-4 hover:bg-slate-50/60 sm:px-6"><span className={`mt-1 size-2 shrink-0 rounded-full ${log.priority === "Urgent" ? "bg-rose-500" : log.priority === "Important" ? "bg-amber-500" : "bg-sky-500"}`} aria-hidden="true"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-sm font-semibold text-slate-800">{log.author}</p><span className="text-xs text-slate-400">{log.department} · {log.time}</span>{log.pinned && <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><Pin className="size-3"/>Pinned</span>}</div><p className="mt-1.5 text-sm leading-6 text-slate-600">{log.message}</p></div></article>)}{visibleLogs.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500 sm:px-6">No Operations Log entries are available for {department}.</p>}</div></Card>;
}

export function QualityScore({ department, score, change = "+2%" }: { department: string; score: number; change?: string }) {
  return <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-slate-900">{department} Quality Score</p><p className="mt-1 text-xs text-slate-500">Last reviewed July 15, 2026</p></div><span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><TrendingUp className="size-4"/></span></div><div className="mt-5 flex items-end gap-3"><p className="text-4xl font-bold tracking-[-.05em] text-slate-950">{score}%</p><Badge tone="success" className="mb-1">{change} from prior review</Badge></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={`${department} quality score ${score} percent`}><div className="h-full rounded-full bg-emerald-500" style={{ width: `${score}%` }}/></div></Card>;
}

export function ListRows({ rows }: { rows: Array<{ title: string; detail: string; meta?: string; badge?: string; tone?: "neutral" | "info" | "success" | "warning" | "urgent"; href?: string }> }) {
  return <div className="divide-y divide-slate-100">{rows.map((row) => { const content = <><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{row.title}</p><p className="mt-1 truncate text-sm text-slate-500">{row.detail}</p></div>{row.badge && <Badge tone={row.tone}>{row.badge}</Badge>}{row.meta && <span className="hidden text-xs text-slate-400 sm:block">{row.meta}</span>}<ChevronRight className="size-4 shrink-0 text-slate-300"/></>; const className = "flex min-h-[72px] w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 sm:px-6"; return row.href ? <Link key={`${row.title}-${row.detail}`} href={row.href} className={className}>{content}</Link> : <button key={`${row.title}-${row.detail}`} className={className}>{content}</button>; })}</div>;
}
