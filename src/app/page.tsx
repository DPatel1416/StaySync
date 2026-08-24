"use client";

import { useRef, useState, type PointerEvent } from "react";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";

type LoginMode = "employee" | "holder";

const stories = {
  employee: { label: "One place for hotel teams", headline: <>Move as <span>one.</span></>, copy: "A calmer, clearer way for every hotel team to work together.", note: "Your shift. Instantly in sync." },
  holder: { label: "One operating view", headline: <>See the <span>whole.</span></>, copy: "Bring every property, team, and standard into focus.", note: "Every property. One clear view." },
};

function KeyCard({ depth = "front", label }: { depth?: "front" | "middle" | "back"; label: string }) {
  return <div className={`access-card access-card-${depth}`}>
    <div className="access-card-face">
      <span className="access-card-slot" />
      <span className="access-card-brand"><span className="access-card-mark"><svg viewBox="0 0 24 24" fill="none"><path d="M5 7.5h9.5a3.5 3.5 0 0 1 0 7H9.2"/><path d="m8 12-3 3 3 3"/><circle cx="17.5" cy="7.5" r="1.5"/></svg></span><span>StaySync</span></span>
      <span className="access-card-wave"><i/><i/><i/></span>
      <span className="access-card-label">{label}</span>
      <span className="access-card-chip"><i/><i/><i/><i/></span>
      <span className="access-card-sheen" />
    </div>
  </div>;
}

function AccessMotion({ mode }: { mode: LoginMode }) {
  const stage = useRef<HTMLDivElement>(null);
  function tilt(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    stage.current?.style.setProperty("--pointer-x", `${((event.clientX - bounds.left) / bounds.width - .5) * 2}`);
    stage.current?.style.setProperty("--pointer-y", `${((event.clientY - bounds.top) / bounds.height - .5) * 2}`);
  }
  function reset() { stage.current?.style.setProperty("--pointer-x", "0"); stage.current?.style.setProperty("--pointer-y", "0"); }

  return <div ref={stage} key={mode} onPointerMove={tilt} onPointerLeave={reset} className={`access-motion access-motion-${mode}`} role="img" aria-label={mode === "employee" ? "A modern hotel access key floating in motion" : "A collection of hotel access keys moving into alignment"}>
    <span className="access-orbit access-orbit-one"/><span className="access-orbit access-orbit-two"/>
    <div className="access-card-stack">
      {mode === "holder" && <><KeyCard depth="back" label="PORTFOLIO"/><KeyCard depth="middle" label="OVERVIEW"/></>}
      <KeyCard label={mode === "employee" ? "TEAM ACCESS" : "STAYSYNC ONE"}/>
    </div>
    <span className="access-floor" />
    <p className="access-motion-caption"><span/>{storyCaption(mode)}</p>
  </div>;
}

function storyCaption(mode: LoginMode) { return mode === "employee" ? "Ready for the shift" : "Everything aligned"; }

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>("employee");
  const story = stories[mode];
  return <main data-login-theme="signal" className="login-shell min-h-[100svh] bg-[#f4f4ef] text-[#151713] lg:grid lg:grid-cols-[minmax(0,1.14fr)_minmax(440px,.86fr)]">
    <section aria-label="About StaySync" className="login-stage relative hidden min-h-[100svh] overflow-hidden px-10 py-8 text-white lg:flex lg:flex-col xl:px-16 xl:py-11">
      <div className="access-ambient" aria-hidden="true"/><div className="access-grid" aria-hidden="true"/>
      <header className="relative z-20 flex items-center justify-between"><Logo inverse/><span className="login-edition">Hotel operations, reimagined</span></header>
      <div key={mode} className="login-story relative z-10 my-auto grid min-h-0 grid-cols-[minmax(310px,.78fr)_minmax(340px,1.22fr)] items-center gap-2">
        <div className="relative z-20"><p className="login-kicker">{story.label}</p><h1 className="login-display mt-5">{story.headline}</h1><p className="mt-7 max-w-[430px] text-lg leading-8 text-white/62">{story.copy}</p></div>
        <AccessMotion mode={mode}/>
      </div>
      <footer className="relative z-20 flex items-center justify-between text-xs text-white/42"><span>{story.note}</span><span className="flex items-center gap-2 text-white/65"><span className="size-1.5 rounded-full bg-[#caff4d] shadow-[0_0_12px_#caff4d]"/>StaySync</span></footer>
    </section>
    <section className="login-access relative flex min-h-[100svh] flex-col overflow-x-hidden px-4 py-5 sm:px-8 lg:justify-center lg:px-10 lg:py-8 xl:px-16">
      <div className="mb-7 flex items-center justify-between lg:hidden"><Logo/><span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#697063]">Hotel operations</span></div>
      <div key={`mobile-${mode}`} className="login-story mb-7 lg:hidden"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#53631e]">{story.label}</p><h1 className="mt-2 max-w-sm text-[2.75rem] font-semibold leading-[.9] tracking-[-.065em] text-[#151713]">{story.headline}</h1></div>
      <div className="relative z-10 mx-auto w-full max-w-[470px]"><LoginForm onModeChange={setMode}/><p className="mt-5 text-center text-xs text-[#777b72]">Protected access for authorized StaySync users.</p></div>
    </section>
  </main>;
}
