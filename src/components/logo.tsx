import { cn } from "@/lib/utils";

export function Logo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return <div className="flex items-center gap-2.5" aria-label="StaySync">
    <span className={cn("grid size-9 place-items-center rounded-xl shadow-sm", inverse ? "bg-white text-indigo-700" : "bg-indigo-600 text-white")} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-5" fill="none"><path d="M5 7.5h9.5a3.5 3.5 0 0 1 0 7H9.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="m8 12-3 3 3 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="17.5" cy="7.5" r="1.5" fill="currentColor"/></svg>
    </span>
    {!compact && <span className={cn("text-xl font-bold tracking-[-.04em]", inverse ? "text-white" : "text-slate-950")}>StaySync</span>}
  </div>;
}
