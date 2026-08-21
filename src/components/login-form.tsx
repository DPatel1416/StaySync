"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { authenticateDemoEmployee, saveDemoEmployeeSession } from "@/lib/demo-auth";
import { Button } from "./ui/button";

type Mode = "employee" | "holder";
type HolderAction = "signin" | "signup";
const inputClass = "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] text-slate-900 shadow-sm placeholder:text-slate-400 hover:border-slate-300 focus:border-brand";
async function getSupabaseClient() { return (await import("@/lib/supabase/client")).createClient(); }

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("employee");
  const [holderAction, setHolderAction] = useState<HolderAction>("signin");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState("");
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  function chooseMode(nextMode: Mode) {
    setMode(nextMode); setHolderAction("signin"); setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "employee") {
        const username = String(form.get("identity"));
        const password = String(form.get("password"));
        if (demoMode) {
          const employee = authenticateDemoEmployee(username, password);
          if (!employee) throw new Error("The username or password is incorrect.");
          saveDemoEmployeeSession(username);
          if (form.get("rememberUsername")) window.localStorage.setItem("staysync-remembered-username", username.trim().toLowerCase());
          window.location.assign(`/app/${employee.workspace}`); return;
        }
        const response = await fetch("/api/auth/employee", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "We could not sign you in.");
        await (await getSupabaseClient()).auth.setSession(result.session);
        window.location.assign(`/app/${result.workspace ?? "front-desk"}`); return;
      }

      const email = String(form.get("identity"));
      const password = String(form.get("password"));
      if (holderAction === "signup") {
        if (password !== String(form.get("confirmPassword"))) throw new Error("The passwords do not match.");
        if (demoMode) { window.location.assign("/app/manager"); return; }
        const response = await fetch("/api/auth/account-holder/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, displayName: form.get("displayName"), organizationName: form.get("organizationName"), propertyName: form.get("propertyName"), propertyRoomCount: Number(form.get("propertyRoomCount")) }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "We could not create your account.");
      }
      if (demoMode) {
        if (email.toLowerCase() !== "owner@northstar.demo" || password !== "staysync-demo") throw new Error("The email or password is incorrect.");
      } else {
        const { error: signInError } = await (await getSupabaseClient()).auth.signInWithPassword({ email, password });
        if (signInError) throw new Error("The email or password is incorrect.");
      }
      window.location.assign("/app/manager");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again."); setLoading(false);
    }
  }

  const creatingAccount = mode === "holder" && holderAction === "signup";
  return <div className="w-full max-w-[430px]">
    <div className="mb-9 lg:hidden"><span className="text-2xl font-bold tracking-tight text-slate-950">StaySync</span></div>
    <p className="text-sm font-semibold text-brand">{creatingAccount ? "Start with StaySync" : "Welcome back"}</p>
    <h1 className="mt-2 text-3xl font-bold tracking-[-.035em] text-slate-950 sm:text-4xl">{creatingAccount ? "Create your hotel account" : "Sign in to your workspace"}</h1>
    <p className="mt-3 text-[15px] leading-6 text-slate-500">{creatingAccount ? "Set up your organization and first property." : "Coordinate the day with your hotel team."}</p>
    <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1 2xl:mt-8" role="tablist" aria-label="Account type">{(["employee", "holder"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => chooseMode(item)} className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition ${mode === item ? "bg-white text-brand-strong shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{item === "employee" ? "Employee" : "Account Holder"}</button>)}</div>
    <form onSubmit={submit} className="mt-6 space-y-4 2xl:mt-7">
      {creatingAccount && <><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-800">Your full name</span><input name="displayName" required autoComplete="name" className={inputClass} placeholder="Maya Chen"/></label><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-semibold text-slate-800">Organization name</span><input name="organizationName" required className={inputClass} placeholder="Northstar Hotels"/></label><label><span className="mb-2 block text-sm font-semibold text-slate-800">First property</span><input name="propertyName" required className={inputClass} placeholder="Ottawa Downtown"/></label></div><div><label htmlFor="property-room-count" className="mb-2 block text-sm font-semibold text-slate-800">Number of guest rooms</label><input id="property-room-count" name="propertyRoomCount" type="number" min="1" max="10000" required aria-describedby="property-room-count-help" className={inputClass} placeholder="142"/><span id="property-room-count-help" className="mt-1.5 block text-xs text-slate-500">Used to plan Housekeeping workload and room-assignment capacity.</span></div></>}
      <div><label htmlFor="identity" className="mb-2 block text-sm font-semibold text-slate-800">{mode === "employee" ? "Username" : "Email address"}</label><div className="relative"><span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-400">{mode === "employee" ? <UserRound className="size-4"/> : <Mail className="size-4"/>}</span><input key={`${mode}-${holderAction}`} id="identity" name="identity" autoComplete={mode === "employee" ? "username" : "email"} type={mode === "employee" ? "text" : "email"} defaultValue={mode === "employee" ? "alex.morgan" : creatingAccount ? "" : "owner@northstar.demo"} required className={`${inputClass} pl-11`}/></div></div>
      <div><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-sm font-semibold text-slate-800">Password</label>{mode === "holder" && holderAction === "signin" && <a href="#" className="text-sm font-semibold text-brand hover:text-brand-strong">Forgot password?</a>}</div><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-4 size-4 text-slate-400"/><input key={`password-${holderAction}`} id="password" name="password" type={show ? "text" : "password"} defaultValue={creatingAccount ? "" : "staysync-demo"} minLength={8} autoComplete={creatingAccount ? "new-password" : "current-password"} required onKeyUp={(event) => setCaps(event.getModifierState("CapsLock"))} className={`${inputClass} pl-11 pr-12`}/><button type="button" onClick={() => setShow((value) => !value)} className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-50" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}</button></div>{caps && <p role="status" className="mt-2 text-sm text-amber-700">Caps Lock is on.</p>}</div>
      {creatingAccount && <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-800">Confirm password</span><input name="confirmPassword" type={show ? "text" : "password"} minLength={8} autoComplete="new-password" required className={inputClass}/></label>}
      {mode === "employee" && <label className="flex min-h-11 items-center gap-3 text-sm text-slate-600"><input name="rememberUsername" type="checkbox" className="size-4 rounded border-slate-300 text-brand focus:ring-brand" defaultChecked/>Remember my username on this device</label>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}
      <Button className="w-full" disabled={loading}>{loading ? <><Loader2 className="size-4 animate-spin"/>Please wait…</> : creatingAccount ? "Create account" : "Sign in"}</Button>
    </form>
    {mode === "holder" ? <p className="mt-6 text-center text-sm text-slate-500">{creatingAccount ? "Already have an account?" : "New to StaySync?"} <button type="button" onClick={() => { setHolderAction(creatingAccount ? "signin" : "signup"); setError(""); }} className="min-h-11 px-1 font-semibold text-brand hover:text-brand-strong">{creatingAccount ? "Sign in" : "Create account"}</button></p> : <p className="mt-6 text-center text-xs leading-5 text-slate-400">Employee access issues? Ask your hotel administrator to reset your password.</p>}
  </div>;
}
