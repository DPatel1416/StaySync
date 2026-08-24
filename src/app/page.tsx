import { ArrowUpRight, CheckCircle2, Clock3 } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";

const shiftEvents = [
  { time: "2:14 PM", title: "Room 604 request received", detail: "Front Desk → Maintenance" },
  { time: "2:15 PM", title: "Jordan acknowledged", detail: "Response underway" },
  { time: "2:22 PM", title: "Guest updated", detail: "Every team is aligned" },
];

export default function LoginPage() {
  return (
    <main data-login-theme="atelier" className="login-shell min-h-[100svh] bg-[#fbf7f2] text-slate-950 lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(440px,.88fr)]">
      <section aria-label="About StaySync" className="login-stage relative hidden min-h-[100svh] overflow-hidden px-10 py-8 text-white lg:flex lg:flex-col xl:px-16 xl:py-11">
        <div className="login-glow login-glow-one" aria-hidden="true" />
        <div className="login-glow login-glow-two" aria-hidden="true" />

        <header className="login-reveal relative z-10 flex items-center justify-between">
          <Logo inverse login />
          <span className="rounded-full border border-white/15 bg-white/[.06] px-4 py-2 text-[11px] font-semibold uppercase tracking-[.16em] text-[#f8d8cc] backdrop-blur-sm">
            Hotel operations, in rhythm
          </span>
        </header>

        <div className="relative z-10 my-auto max-w-[720px] py-10">
          <p className="login-reveal login-kicker text-xs font-bold uppercase tracking-[.22em] text-[#f5ad98]">The operating layer behind every great stay</p>
          <h1 className="login-reveal login-reveal-delay mt-5 max-w-[680px] text-[clamp(3.65rem,6vw,6.8rem)] font-semibold leading-[.88] tracking-[-.068em] text-[#fffaf5]">
            Good stays are <span className="font-serif font-normal italic text-[#f4a48e]">choreographed.</span>
          </h1>
          <p className="login-reveal login-reveal-delay-two mt-7 max-w-[570px] text-lg leading-8 text-[#ddcac5]">
            StaySync turns every request, handoff, and room update into one calm, coordinated shift.
          </p>

          <div className="login-reveal login-reveal-delay-three mt-10 max-w-[650px]" aria-label="Live shift coordination preview">
            <div className="login-live-panel relative overflow-hidden rounded-[26px] border border-white/12 bg-white/[.065] p-5 shadow-[0_24px_80px_rgba(17,4,12,.22)] backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="login-live-dot size-2 rounded-full bg-[#f0715d]" aria-hidden="true" />
                  <span className="text-sm font-semibold text-white">Live shift</span>
                </div>
                <span className="flex items-center gap-2 text-xs text-[#cbb8b4]"><Clock3 className="size-3.5" /> Ottawa Downtown</span>
              </div>
              <ol className="grid gap-1">
                {shiftEvents.map((event, index) => (
                  <li key={event.time} className="login-event grid grid-cols-[72px_24px_1fr] items-center gap-2 rounded-xl px-2 py-2.5" style={{ animationDelay: `${index * 1.4}s` }}>
                    <time className="text-xs tabular-nums text-[#bfa9a4]">{event.time}</time>
                    <span className="grid size-6 place-items-center rounded-full bg-[#f0715d]/15 text-[#f4a48e]"><CheckCircle2 className="size-3.5" /></span>
                    <span><span className="block text-sm font-semibold text-[#fffaf5]">{event.title}</span><span className="mt-0.5 block text-xs text-[#bfa9a4]">{event.detail}</span></span>
                  </li>
                ))}
              </ol>
              <svg className="login-ribbon pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-35" viewBox="0 0 700 100" preserveAspectRatio="none" aria-hidden="true">
                <path className="login-ribbon-base" d="M-20 80 C140 10 260 120 410 52 S610 18 730 58" />
                <path className="login-ribbon-flow" d="M-20 80 C140 10 260 120 410 52 S610 18 730 58" />
              </svg>
            </div>
          </div>
        </div>

        <footer className="login-reveal login-reveal-delay-three relative z-10 flex items-center justify-between text-xs text-[#bda9a5]">
          <span>Front Desk · Housekeeping · Maintenance · Management</span>
          <span className="flex items-center gap-1.5 text-[#f8d8cc]">One shared standard <ArrowUpRight className="size-3.5" /></span>
        </footer>
      </section>

      <section className="login-access relative flex min-h-[100svh] flex-col overflow-x-hidden px-4 py-5 sm:px-8 lg:justify-center lg:px-10 lg:py-8 xl:px-16">
        <div className="mb-7 flex items-center justify-between lg:hidden">
          <Logo login />
          <span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#9f665a]">Hotel operations</span>
        </div>
        <div className="login-mobile-intro mb-7 lg:hidden">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#b94737]">Every team, one shift</p>
          <h1 className="mt-2 max-w-sm text-[2.65rem] font-semibold leading-[.92] tracking-[-.06em] text-[#321526]">Good stays are <span className="font-serif font-normal italic text-[#c14f3f]">choreographed.</span></h1>
        </div>
        <div className="relative z-10 mx-auto w-full max-w-[470px]">
          <LoginForm />
          <p className="mt-5 text-center text-xs text-[#8b7772]">Protected access for authorized StaySync users.</p>
        </div>
      </section>
    </main>
  );
}
