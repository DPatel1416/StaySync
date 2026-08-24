"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { authenticateDemoEmployee, saveDemoEmployeeSession } from "@/lib/demo-auth";
import { Button } from "./ui/button";

type Mode = "employee" | "holder";
type HolderAction = "signin" | "signup";
const inputClass = "h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-[15px] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,.8)] placeholder:text-slate-400 transition hover:border-slate-300 hover:bg-white focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10";
async function getSupabaseClient() { return (await import("@/lib/supabase/client")).createClient(); }

export function LoginForm({ onModeChange }: { onModeChange?: (mode: Mode) => void } = {}) {
  const [mode, setMode] = useState<Mode>("employee");
  const [holderAction, setHolderAction] = useState<HolderAction>("signin");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState("");
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  function chooseMode(nextMode: Mode) {
    setMode(nextMode); setHolderAction("signin"); setError(""); onModeChange?.(nextMode);
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
        if (demoMode) { window.location.assign("/onboarding"); return; }
        const response = await fetch("/api/auth/account-holder/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, displayName: form.get("displayName") }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "We could not create your account.");
      }
      if (demoMode) {
        if (email.toLowerCase() !== "owner@northstar.demo" || password !== "staysync-demo") throw new Error("The email or password is incorrect.");
      } else {
        const client = await getSupabaseClient();
        const { data: signIn, error: signInError } = await client.auth.signInWithPassword({ email, password });
        if (signInError) throw new Error("The email or password is incorrect.");
        if (holderAction === "signup") { window.location.assign("/onboarding"); return; }
        const { data: profile } = await client.from("users").select("home_property_id").eq("id", signIn.user.id).maybeSingle();
        if (!profile?.home_property_id) { window.location.assign("/onboarding"); return; }
      }
      window.location.assign("/app/manager");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again."); setLoading(false);
    }
  }

  const creatingAccount = mode === "holder" && holderAction === "signup";
  return <div className="w-full max-w-[470px] rounded-[30px] border border-[#dedfd8] bg-[#fbfcf8]/95 p-6 shadow-[0_28px_90px_rgba(21,23,19,.10),0_2px_8px_rgba(21,23,19,.04)] backdrop-blur-xl sm:p-8 lg:p-7 xl:p-9">
    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#dce8bd] bg-[#f4fadf] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.13em] text-[#53631e]"><ShieldCheck className="size-3.5"/>Secure workspace access</div>
    <h1 className="text-3xl font-bold tracking-[-.045em] text-slate-950 sm:text-[2.15rem]">{creatingAccount ? "Create your account" : mode === "holder" ? "Welcome back." : "Welcome to the shift."}</h1>
    <p className="mt-2.5 text-sm leading-6 text-slate-500">{creatingAccount ? "Start with your basic account details. We’ll set up your property next." : mode === "holder" ? "Sign in to manage your hotels and account." : "Sign in and pick up exactly where your team left off."}</p>
    <div className="mt-6 grid grid-cols-2 rounded-xl border border-slate-200/80 bg-slate-100/80 p-1" role="tablist" aria-label="Account type">{(["employee", "holder"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => chooseMode(item)} className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition ${mode === item ? "bg-white text-slate-950 shadow-[0_1px_4px_rgba(15,23,42,.12)]" : "text-slate-500 hover:text-slate-900"}`}>{item === "employee" ? "Employee" : "Account Holder"}</button>)}</div>
    <p className="mt-3 min-h-5 text-xs leading-5 text-slate-500">{mode === "employee" ? "For hotel team members using an administrator-issued username." : "For organization owners managing properties, access, and subscription settings."}</p>
    <form onSubmit={submit} className="mt-5 space-y-4">
      {creatingAccount && <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-800">Your full name</span><input name="displayName" required autoComplete="name" className={inputClass} placeholder="Maya Chen"/></label>}
      <div><label htmlFor="identity" className="mb-2 block text-sm font-semibold text-slate-800">{mode === "employee" ? "Username" : "Email address"}</label><div className="relative"><span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-400">{mode === "employee" ? <UserRound className="size-4"/> : <Mail className="size-4"/>}</span><input key={`${mode}-${holderAction}`} id="identity" name="identity" autoComplete={mode === "employee" ? "username" : "email"} type={mode === "employee" ? "text" : "email"} defaultValue={mode === "employee" ? "alex.morgan" : creatingAccount ? "" : "owner@northstar.demo"} required className={`${inputClass} pl-11`}/></div></div>
      <div><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-sm font-semibold text-slate-800">Password</label>{mode === "holder" && holderAction === "signin" && <a href="#" className="text-sm font-semibold text-brand hover:text-brand-strong">Forgot password?</a>}</div><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-4 size-4 text-slate-400"/><input key={`password-${holderAction}`} id="password" name="password" type={show ? "text" : "password"} defaultValue={creatingAccount ? "" : "staysync-demo"} minLength={8} autoComplete={creatingAccount ? "new-password" : "current-password"} required onKeyUp={(event) => setCaps(event.getModifierState("CapsLock"))} className={`${inputClass} pl-11 pr-12`}/><button type="button" onClick={() => setShow((value) => !value)} className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-50" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}</button></div>{caps && <p role="status" className="mt-2 text-sm text-amber-700">Caps Lock is on.</p>}</div>
      {creatingAccount && <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-800">Confirm password</span><input name="confirmPassword" type={show ? "text" : "password"} minLength={8} autoComplete="new-password" required className={inputClass}/></label>}
      {mode === "employee" && <label className="flex min-h-11 items-center gap-3 text-sm text-slate-600"><input name="rememberUsername" type="checkbox" className="size-4 rounded border-slate-300 text-brand focus:ring-brand" defaultChecked/>Remember my username on this device</label>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}
      <Button className="h-12 w-full bg-[#171a15] text-white shadow-[0_10px_24px_rgba(21,23,19,.18)] hover:bg-[#252a20]" disabled={loading}>{loading ? <><Loader2 className="size-4 animate-spin"/>Please wait…</> : creatingAccount ? "Create account" : "Enter StaySync"}</Button>
    </form>
    {mode === "holder" ? <p className="mt-5 text-center text-sm text-slate-500">{creatingAccount ? "Already have an account?" : "New to StaySync?"} <button type="button" onClick={() => { setHolderAction(creatingAccount ? "signin" : "signup"); setError(""); }} className="min-h-11 px-1 font-semibold text-brand hover:text-brand-strong">{creatingAccount ? "Sign in" : "Create account"}</button></p> : <p className="mt-5 text-center text-xs leading-5 text-slate-400">Need access? Your hotel administrator can create or reset your employee account.</p>}
  </div>;
}
