import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f6ef] p-4 text-[#233b2c] sm:p-8 lg:flex lg:items-center lg:p-10">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[#dfe6d9] bg-white shadow-[0_24px_90px_-35px_#28483240] lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative overflow-hidden bg-[#294d3b] px-7 py-7 text-[#f7f8ec] sm:px-10 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="relative z-10 flex items-center gap-3 text-xl font-semibold tracking-tight">
            <svg aria-hidden="true" viewBox="0 0 32 32" className="h-9 w-9 fill-none"><path d="M16 27V14" stroke="#d5e6b5" strokeWidth="2" strokeLinecap="round"/><path d="M16 18C5 18 4 10 4 7c9-1 14 3 12 11Z" fill="#a8c48b"/><path d="M16 14C15 4 23 2 29 3c0 8-6 13-13 11Z" fill="#d5e6b5"/></svg>
            Momentum
          </div>
          <div className="relative z-10 mt-7 lg:my-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#c9dbb6]">A little progress, every day</p>
            <h2 className="mt-4 max-w-sm text-3xl font-medium leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">Small steps.<br/><span className="text-[#d5e6b5]">Room to grow.</span></h2>
            <p className="mt-5 hidden max-w-xs text-sm leading-7 text-[#d5e1d7] sm:block">Make time for what matters. Build your rhythm, one focused moment at a time.</p>
            <div aria-hidden="true" className="relative mt-10 hidden h-56 sm:block">
              <div className="absolute bottom-3 left-8 h-44 w-44 rounded-full border border-white/15 bg-white/5"/>
              <svg viewBox="0 0 250 220" className="absolute bottom-0 left-2 h-56 w-64 fill-none"><path d="M121 181c4-51 2-95 12-142" stroke="#d5e6b5" strokeWidth="3" strokeLinecap="round"/><path d="M128 99C91 101 72 76 75 53c35 1 53 20 53 46Z" fill="#92b28a"/><path d="M126 130c37 4 63-18 63-46-36-2-60 16-63 46Z" fill="#c6dbac"/><path d="M132 64c28-2 44-19 42-41-29 0-44 18-42 41Z" fill="#e3edcb"/><path d="M90 175h69l-9 35h-51Z" fill="#d7b99a"/><path d="M84 175h82" stroke="#edd6bb" strokeWidth="7" strokeLinecap="round"/></svg>
              <div className="absolute right-0 top-8 w-44 rotate-[-4deg] rounded-2xl border border-white/20 bg-[#f7f8ec] p-4 text-[#294d3b] shadow-lg">
                <p className="text-[10px] font-semibold uppercase tracking-widest">One step at a time</p>
                <div className="mt-4 flex gap-2">{[0,1,2,3,4,5,6].map((day) => <span key={day} className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] ${day < 4 ? "bg-[#54785a] text-white" : "bg-[#e5eadf]"}`}>{day < 4 ? "✓" : ""}</span>)}</div>
                <p className="mt-3 text-xs text-[#617461]">Your own pace. Your own path.</p>
              </div>
            </div>
          </div>
          <p className="relative z-10 hidden text-xs text-[#c9dbb6] lg:block">Focus today. A better tomorrow.</p>
          <div aria-hidden="true" className="absolute -right-32 -top-24 h-80 w-80 rounded-full border border-white/10"/>
        </aside>
        <section className="flex items-center px-6 py-9 sm:px-12 sm:py-12 lg:px-14">
          <div className="w-full">{children}</div>
        </section>
      </div>
    </main>
  );
}
