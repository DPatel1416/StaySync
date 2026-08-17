"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "./ui/button";

type Mode = "employee" | "holder";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("employee");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [caps, setCaps] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true);
    const target = mode === "employee" ? "/app/front-desk" : "/app/manager";
    window.setTimeout(() => window.location.assign(target), 550);
  }

  return <div className="w-full max-w-[430px]">
    <div className="mb-9 lg:hidden"><span className="text-2xl font-bold tracking-tight text-slate-950">StaySync</span></div>
    <p className="text-sm font-semibold text-indigo-600">Welcome back</p>
    <h1 className="mt-2 text-3xl font-bold tracking-[-.035em] text-slate-950 sm:text-4xl">Sign in to your workspace</h1>
    <p className="mt-3 text-[15px] leading-6 text-slate-500">Coordinate the day with your hotel team.</p>

    <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1 2xl:mt-8" role="tablist" aria-label="Account type">
      {(["employee", "holder"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => setMode(item)} className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition ${mode === item ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{item === "employee" ? "Employee" : "Account Holder"}</button>)}
    </div>

    <form onSubmit={submit} className="mt-6 space-y-4 2xl:mt-7 2xl:space-y-5">
      <div><label htmlFor="identity" className="mb-2 block text-sm font-semibold text-slate-800">{mode === "employee" ? "Username" : "Email address"}</label>
        <div className="relative"><span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-400">{mode === "employee" ? <UserRound className="size-4" /> : <Mail className="size-4" />}</span><input id="identity" name="identity" autoComplete={mode === "employee" ? "username" : "email"} type={mode === "employee" ? "text" : "email"} defaultValue={mode === "employee" ? "alex.morgan" : "owner@northstar.demo"} required className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-[15px] text-slate-900 shadow-sm placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500" /></div>
      </div>
      <div><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-sm font-semibold text-slate-800">Password</label>{mode === "holder" && <a href="#" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Forgot password?</a>}</div>
        <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-4 size-4 text-slate-400"/><input id="password" name="password" type={show ? "text" : "password"} defaultValue="staysync-demo" autoComplete="current-password" required onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-[15px] shadow-sm hover:border-slate-300 focus:border-indigo-500"/><button type="button" onClick={() => setShow((v) => !v)} className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-50" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}</button></div>
        {caps && <p role="status" className="mt-2 text-sm text-amber-700">Caps Lock is on.</p>}
      </div>
      {mode === "employee" && <label className="flex min-h-11 items-center gap-3 text-sm text-slate-600"><input type="checkbox" className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" defaultChecked/> Remember my username on this device</label>}
      <Button className="w-full" disabled={loading}>{loading ? <><Loader2 className="size-4 animate-spin"/>Signing you in…</> : "Sign in"}</Button>
    </form>
    <p className="mt-6 text-center text-xs leading-5 text-slate-400 2xl:mt-8">Employee access issues? Ask your hotel administrator to reset your password.</p>
  </div>;
}
