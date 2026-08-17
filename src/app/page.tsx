import { ArrowRight, CheckCircle2, MessageSquareText, Sparkles, Wrench } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  return <main className="min-h-dvh bg-white lg:grid lg:h-dvh lg:min-h-0 lg:grid-cols-[1.08fr_.92fr] lg:overflow-hidden">
    <section className="login-grid relative hidden h-dvh overflow-hidden bg-indigo-900 bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-12 2xl:p-16" aria-label="About StaySync">
      <div className="absolute -right-24 top-24 size-96 rounded-full bg-violet-400/20 blur-3xl"/><div className="absolute -bottom-40 -left-32 size-[34rem] rounded-full bg-sky-400/10 blur-3xl"/>
      <Logo inverse />
      <div className="relative z-10 max-w-xl py-4 2xl:pb-8">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-indigo-100 backdrop-blur"><Sparkles className="size-4"/>Calm operations. Exceptional stays.</div>
        <h2 className="text-5xl font-semibold leading-[1.05] tracking-[-.055em] xl:text-6xl">Hotel operations,<br/>finally in sync.</h2>
        <p className="mt-6 max-w-lg text-lg leading-8 text-indigo-100/85">Coordinate teams, resolve guest needs, and keep every department aligned—without the noise.</p>
        <div className="relative mt-8 max-w-lg rounded-3xl border border-white/15 bg-white/[.09] p-3 shadow-2xl backdrop-blur-md 2xl:mt-12">
          <div className="rounded-2xl bg-white p-5 text-slate-900 shadow-xl">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today · Ottawa Downtown</p><p className="mt-1 font-semibold">Morning operations</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Teams aligned</span></div>
            <div className="mt-5 space-y-2.5">
              {[{ icon: MessageSquareText, text: "VIP group arrival shared", meta: "Management · 2 min ago", c: "bg-indigo-50 text-indigo-600" }, { icon: Wrench, text: "Room 604 AC · In progress", meta: "Maintenance · Jordan", c: "bg-amber-50 text-amber-700" }, { icon: CheckCircle2, text: "Room 307 changed to stayover", meta: "Housekeeping notified", c: "bg-emerald-50 text-emerald-700" }].map((item) => <div key={item.text} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><span className={`grid size-9 place-items-center rounded-lg ${item.c}`}><item.icon className="size-4"/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.text}</p><p className="mt-0.5 text-xs text-slate-400">{item.meta}</p></div><ArrowRight className="size-4 text-slate-300"/></div>)}
            </div>
          </div>
        </div>
      </div>
      <p className="relative z-10 text-sm text-indigo-200/70">Built for the people who keep hotels moving.</p>
    </section>
    <section className="flex min-h-dvh items-center justify-center overflow-y-auto px-6 py-8 sm:px-12 lg:h-dvh lg:min-h-0 lg:px-12 lg:py-5 xl:px-16"><LoginForm /></section>
  </main>;
}
