"use client";

import { useState } from "react";
import { BedDouble, Building2, Loader2, MapPin } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const fieldClass = "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] text-slate-950 placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10";

export default function PropertyOnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    if (demoMode) { window.location.assign("/app/manager"); return; }
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

  return <main data-login-theme="signal" className="min-h-[100svh] bg-[#f4f4ef] px-4 py-6 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-3xl">
      <header className="flex items-center justify-between"><Logo/><span className="text-xs font-semibold text-slate-500">Account setup</span></header>
      <section className="mt-8 overflow-hidden rounded-[30px] border border-[#dedfd8] bg-[#fbfcf8] shadow-[0_28px_90px_rgba(21,23,19,.10)] sm:mt-12">
        <div className="border-b border-slate-200 px-6 py-7 sm:px-10 sm:py-9">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#dce8bd] bg-[#f4fadf] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.13em] text-[#53631e]"><Building2 className="size-3.5"/>Your first property</span>
          <h1 className="mt-5 text-3xl font-bold tracking-[-.045em] text-slate-950 sm:text-4xl">Tell us about your hotel.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">These details configure your property workspace, departments, and Housekeeping capacity. You can update them later in Settings.</p>
        </div>
        <form onSubmit={submit} className="space-y-6 px-6 py-7 sm:px-10 sm:py-9">
          <fieldset className="space-y-4"><legend className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900"><Building2 className="size-4 text-brand"/>Property identity</legend><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-semibold text-slate-700">Organization name</span><input name="organizationName" required className={fieldClass} placeholder="Northstar Hotels"/></label><label><span className="mb-2 block text-sm font-semibold text-slate-700">Property name</span><input name="propertyName" required className={fieldClass} placeholder="Ottawa Downtown"/></label></div><label className="block sm:max-w-[calc(50%-0.5rem)]"><span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><BedDouble className="size-4 text-slate-400"/>Number of guest rooms</span><input name="roomCount" type="number" min="1" max="10000" required className={fieldClass} placeholder="142"/></label></fieldset>
          <fieldset className="space-y-4 border-t border-slate-200 pt-6"><legend className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900"><MapPin className="size-4 text-brand"/>Location</legend><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Street address <span className="font-normal text-slate-400">(optional)</span></span><input name="addressLine" autoComplete="street-address" className={fieldClass} placeholder="123 Queen Street"/></label><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-semibold text-slate-700">City</span><input name="city" required autoComplete="address-level2" className={fieldClass} placeholder="Ottawa"/></label><label><span className="mb-2 block text-sm font-semibold text-slate-700">Province or state</span><input name="region" required autoComplete="address-level1" className={fieldClass} placeholder="Ontario"/></label><label><span className="mb-2 block text-sm font-semibold text-slate-700">Postal or ZIP code <span className="font-normal text-slate-400">(optional)</span></span><input name="postalCode" autoComplete="postal-code" className={fieldClass} placeholder="K1P 1J1"/></label><label><span className="mb-2 block text-sm font-semibold text-slate-700">Country</span><input name="country" required autoComplete="country-name" className={fieldClass} placeholder="Canada"/></label></div></fieldset>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <div className="flex flex-col-reverse items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row"><p className="text-xs text-slate-500">You can add more properties after setup.</p><Button type="submit" disabled={loading} className="h-12 w-full bg-[#171a15] px-7 text-white hover:bg-[#252a20] sm:w-auto">{loading ? <><Loader2 className="size-4 animate-spin"/>Setting up…</> : "Finish property setup"}</Button></div>
        </form>
      </section>
    </div>
  </main>;
}
