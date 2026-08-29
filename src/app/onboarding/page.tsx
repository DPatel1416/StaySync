"use client";

import { useState } from "react";
import { BedDouble, Building2, Check, Hotel, Loader2, MapPin, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const fieldClass = "h-11 w-full rounded-xl border border-[#dde1d6] bg-[#f8f9f5] px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#8eaa45] focus:bg-white focus:ring-4 focus:ring-[#b8dc59]/15";

function PropertyPreview() {
  return <div className="relative mx-auto h-[248px] w-full max-w-[390px]" aria-hidden="true">
    <span className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#caff4d]/10"/>
    <span className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#caff4d]/10"/>
    <div className="absolute inset-x-5 top-4 rotate-[-3deg] rounded-[24px] border border-white/10 bg-[#242820]/75 p-4 shadow-2xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between"><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-white/50"><Hotel className="size-3.5 text-[#caff4d]"/>Your property</span><span className="size-2 rounded-full bg-[#caff4d] shadow-[0_0_14px_#caff4d]"/></div>
      <div className="grid grid-cols-3 gap-2">
        {["Front desk", "Housekeeping", "Maintenance"].map((department, index) => <div key={department} className="rounded-xl border border-white/[.07] bg-white/[.045] p-2.5"><span className="mb-5 block size-5 rounded-lg bg-[#caff4d]/10 p-1 text-center text-[9px] font-bold text-[#caff4d]">{index + 1}</span><span className="block truncate text-[9px] font-semibold text-white/62">{department}</span></div>)}
      </div>
    </div>
    <div className="absolute bottom-1 left-1/2 flex w-[82%] -translate-x-1/2 items-center justify-between rounded-2xl border border-[#dfff91]/20 bg-[#171a15]/95 px-4 py-3 shadow-[0_24px_50px_rgba(0,0,0,.45)]">
      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-white/65"><span className="grid size-7 place-items-center rounded-lg bg-[#caff4d] text-[#151713]"><Check className="size-4"/></span>Workspace ready</span>
      <span className="text-[10px] font-semibold text-[#caff4d]">One clear view</span>
    </div>
  </div>;
}

export default function PropertyOnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const client = (await import("@/lib/supabase/client")).createClient();
      const { data: session } = await client.auth.getSession();
      if (!session.session) throw new Error("Your session has expired. Please sign in again.");
      const response = await fetch("/api/onboarding/property", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session.access_token}` },
        body: JSON.stringify({
          organizationName: form.get("organizationName"), propertyName: form.get("propertyName"), roomCount: Number(form.get("roomCount")),
          addressLine: form.get("addressLine"), city: form.get("city"), region: form.get("region"), postalCode: form.get("postalCode"), country: form.get("country"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "We could not finish property setup.");
      window.location.assign("/app/manager");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again."); setLoading(false);
    }
  }

  return <main data-login-theme="signal" className="login-shell min-h-[100svh] bg-[#f4f4ef] text-[#151713] lg:grid lg:h-[100svh] lg:grid-cols-[minmax(340px,.72fr)_minmax(680px,1.28fr)] lg:overflow-hidden">
    <section aria-label="Your StaySync workspace" className="login-stage relative hidden min-h-[100svh] overflow-hidden px-9 py-7 text-white lg:flex lg:flex-col xl:px-12 xl:py-9">
      <div className="access-ambient"/><div className="access-grid"/>
      <header className="relative z-20 flex items-center justify-between"><Logo inverse/><span className="login-edition">Setup · 01 / 01</span></header>
      <div className="login-story relative z-10 my-auto">
        <p className="login-kicker">Build your command center</p>
        <h1 className="mt-4 max-w-md text-[clamp(3.5rem,5.2vw,5.9rem)] font-semibold leading-[.86] tracking-[-.075em] text-[#f5f6ef]">Your hotel,<br/><span className="text-transparent [-webkit-text-stroke:1.2px_rgba(218,255,126,.8)]">in sync.</span></h1>
        <p className="mt-5 max-w-sm text-sm leading-6 text-white/55">One quick setup creates the operating space where your teams, standards, and daily work come together.</p>
        <PropertyPreview/>
      </div>
      <footer className="relative z-20 flex items-center justify-between text-[11px] text-white/42"><span>Built for modern hotel teams</span><span className="flex items-center gap-2 text-white/65"><span className="size-1.5 rounded-full bg-[#caff4d] shadow-[0_0_12px_#caff4d]"/>StaySync</span></footer>
    </section>

    <section className="login-access relative flex min-h-[100svh] flex-col px-4 py-4 sm:px-6 lg:h-[100svh] lg:min-h-0 lg:px-7 xl:px-10">
      <div className="mb-4 flex items-center justify-between lg:hidden"><Logo/><span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#697063]">Account setup</span></div>
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col justify-center">
        <section className="flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden rounded-[28px] border border-[#dcded6] bg-[rgba(252,253,249,.92)] shadow-[0_30px_90px_rgba(29,32,23,.13)] backdrop-blur-xl">
          <div className="relative overflow-hidden border-b border-[#e1e3dc] px-5 py-4 sm:px-7">
            <div className="absolute -right-16 -top-24 size-56 rounded-full bg-[#caff4d]/10 blur-3xl"/>
            <div className="relative flex items-start justify-between gap-5">
              <div><span className="inline-flex items-center gap-2 rounded-full border border-[#d8e6b6] bg-[#f4fadf] px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#53631e]"><Sparkles className="size-3"/>Your first property</span><h2 className="mt-3 text-2xl font-bold tracking-[-.045em] text-slate-950 sm:text-[2rem]">Let’s set up your hotel.</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Add the essentials now. You can refine every detail later in Settings.</p></div>
              <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-[#e1e4da] bg-white/70 px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#6d7465] sm:flex"><span className="grid size-6 place-items-center rounded-lg bg-[#171a15] text-white"><Check className="size-3.5"/></span>Final step</div>
            </div>
          </div>

          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4 px-5 py-4 sm:px-7">
            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[.85fr_1.15fr]">
              <fieldset className="flex flex-col justify-evenly gap-3 rounded-2xl border border-[#e1e4dc] bg-white/70 p-4">
                <legend className="ml-1 px-2 text-[11px] font-bold uppercase tracking-[.13em] text-[#53631e]"><span className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-[#edf5d8]"><Building2 className="size-4"/></span>Property identity</span></legend>
                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Organization name</span><input name="organizationName" required className={fieldClass} placeholder="Your hotel group"/></label>
                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Property name</span><input name="propertyName" required className={fieldClass} placeholder="Your property name"/></label>
                <label className="block"><span className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-700"><BedDouble className="size-3.5 text-slate-400"/>Number of guest rooms</span><input name="roomCount" type="number" min="1" max="10000" required className={fieldClass} placeholder="100"/></label>
              </fieldset>
              <fieldset className="flex flex-col justify-evenly gap-3 rounded-2xl border border-[#e1e4dc] bg-white/70 p-4">
                <legend className="ml-1 px-2 text-[11px] font-bold uppercase tracking-[.13em] text-[#53631e]"><span className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-[#edf5d8]"><MapPin className="size-4"/></span>Location</span></legend>
                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Street address <span className="font-normal text-slate-400">(optional)</span></span><input name="addressLine" autoComplete="street-address" className={fieldClass} placeholder="123 Queen Street"/></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label><span className="mb-1 block text-xs font-bold text-slate-700">City</span><input name="city" required autoComplete="address-level2" className={fieldClass} placeholder="Ottawa"/></label>
                  <label><span className="mb-1 block text-xs font-bold text-slate-700">Province or state</span><input name="region" required autoComplete="address-level1" className={fieldClass} placeholder="Ontario"/></label>
                  <label><span className="mb-1 block text-xs font-bold text-slate-700">Postal or ZIP code <span className="font-normal text-slate-400">(optional)</span></span><input name="postalCode" autoComplete="postal-code" className={fieldClass} placeholder="K1P 1J1"/></label>
                  <label><span className="mb-1 block text-xs font-bold text-slate-700">Country</span><input name="country" required autoComplete="country-name" className={fieldClass} placeholder="Canada"/></label>
                </div>
              </fieldset>
            </div>
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
            <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-[#e1e3dc] pt-3 sm:flex-row"><p className="text-[11px] text-slate-500">Your workspace will be ready in moments.</p><Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-[#171a15] px-7 text-white shadow-[0_10px_24px_rgba(23,26,21,.18)] hover:bg-[#2a3023] sm:w-auto">{loading ? <><Loader2 className="size-4 animate-spin"/>Creating your workspace…</> : <>Create my workspace <span aria-hidden="true">→</span></>}</Button></div>
          </form>
        </section>
      </div>
    </section>
  </main>;
}
