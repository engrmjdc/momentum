"use client";

import Link from "next/link";
import BetaWelcome from "./beta-welcome";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ToastProvider } from "./toast-provider";
import TodoReminderWatcher from "./todo-reminder-watcher";

type AppShellProps = {
  children: React.ReactNode;
  displayName: string;
  timezone: string;
};

const navigation = [
  {
    name: "Today",
    href: "/today",
    icon: "☀️",
  },
  {
    name: "To Do",
    href: "/todos",
    icon: "✓",
  },
  {
    name: "Goals",
    href: "/goals",
    icon: "🎯",
  },
  {
    name: "Projects",
    href: "/projects",
    icon: "📁",
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: "🗓️",
  },
  {
    name: "Progress",
    href: "/progress",
    icon: "📈",
  },
];

export default function AppShell({
  children,
  displayName,
  timezone,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const signingOut = useRef(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    navigation.forEach((item) => router.prefetch(item.href));
    router.prefetch("/settings");
  }, [router]);

  async function handleSignOut() {
    if (signingOut.current) return;
    signingOut.current = true;
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setMobileMenuOpen(false);
      router.replace("/login");
    } catch {
      setSignOutError("Could not sign out. Please try again.");
    } finally {
      signingOut.current = false;
      setIsSigningOut(false);
    }
  }

  const signOutAction = (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-[#edf3ee] hover:text-[#45634c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45634c] disabled:cursor-wait disabled:opacity-60"
      >
        <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center text-lg">↪</span>
        {isSigningOut ? "Signing out…" : "Sign Out"}
      </button>
      {signOutError && (
        <p role="alert" className="mt-2 px-3 text-xs text-red-700">
          {signOutError}
        </p>
      )}
    </div>
  );


  const firstName =
    displayName.trim().split(/\s+/)[0] ||
    "User";

  return (
    <ToastProvider>
    <TodoReminderWatcher timezone={timezone} />
    <div className="min-h-screen bg-[#f5f6ef]">

      {/* DESKTOP SIDEBAR */}

      <aside className="app-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 overflow-hidden border-r border-[#d8e2d5] bg-gradient-to-b from-[#fcfdf8] via-[#f9fbf5] to-[#f3f7ee] lg:flex lg:flex-col">

        <div aria-hidden="true" className="pointer-events-none absolute -right-16 top-24 h-44 w-44 rounded-full bg-[#e6edda]/70 blur-2xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-20 bottom-36 h-48 w-48 rounded-full bg-[#dfe9e1]/55 blur-3xl" />

        {/* LOGO */}

        <div className="relative z-10 flex h-24 items-center border-b border-[#e4eae0] px-6">
          <Link
            href="/today"
            className="group flex items-center gap-3 text-lg font-bold text-[#36523d]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d8e3d2] bg-white text-xl shadow-[0_8px_22px_-15px_#294d3b80] transition group-hover:-rotate-3 group-hover:scale-105">
              🌱
            </span>
            <span><span className="block">Momentum</span><span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-[#83917e]">Make today count</span></span>
          </Link>
        </div>

        {/* NAVIGATION */}

        <nav aria-label="Workspace" className="relative z-10 flex-1 px-4 py-6">
          <div className="mb-4 flex items-center gap-3 px-3"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#74816f]">Workspace</p><span className="h-px flex-1 bg-[#dfe6d9]" /></div>

          <div className="space-y-1">
            {navigation.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(
                  `${item.href}/`
                );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-[#294d3b] text-[#f7f8ec] shadow-[0_6px_16px_-8px_#294d3b80]"
                      : "text-[#61715f] hover:bg-[#edf2e5] hover:text-[#294d3b]"
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-base transition ${active ? "bg-white/12" : "bg-[#eef3e8] group-hover:bg-white"}`}>
                    {item.icon}
                  </span>

                  <span>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="relative mt-8 overflow-hidden rounded-3xl border border-[#d2dfca] bg-gradient-to-br from-[#eaf1df] to-[#f5f8ed] p-4 shadow-[0_12px_28px_-22px_#294d3b80]">
            <div aria-hidden="true" className="absolute -right-7 -top-7 h-20 w-20 rounded-full bg-white/65" />
            <div aria-hidden="true" className="absolute -bottom-9 -left-7 h-20 w-20 rounded-full bg-[#dce8d3]" />
            <div className="relative"><span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">🌿</span>
            <p className="mt-3 text-sm font-semibold text-[#294d3b]">A little progress counts.</p>
            <p className="mt-2 text-xs leading-5 text-[#61715f]">Give one meaningful thing your full attention.</p>
            <Link href="/focus" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#45634c] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#294d3b]">Start focusing <span aria-hidden="true">→</span></Link></div>
          </div>
        </nav>

        {/* BOTTOM */}

        <div className="app-sidebar-footer relative z-10 border-t border-[#e1e8dd] bg-white/45 p-4 backdrop-blur-sm">
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              pathname.startsWith(
                "/settings"
              )
                ? "bg-[#294d3b] text-[#f7f8ec] shadow-[0_6px_16px_-8px_#294d3b80]"
                : "text-[#61715f] hover:bg-[#edf2e5] hover:text-[#294d3b]"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center">
              ⚙️
            </span>

            Settings
          </Link>

          {signOutAction}
        </div>
      </aside>

      {/* MOBILE HEADER */}

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#e3e9e3] bg-[#fcfdf8]/95 px-5 backdrop-blur lg:hidden">
        <Link
          href="/today"
          className="flex items-center gap-2 font-bold text-[#45634c]"
        >
          <span>
            🌱
          </span>

          <span>
            Momentum
          </span>
        </Link>

        <button
          type="button"
          onClick={() =>
            setMobileMenuOpen(
              (current) => !current
            )
          }
          aria-label="Toggle navigation"
          aria-expanded={
            mobileMenuOpen
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfe6d9] bg-white text-lg text-gray-600"
        >
          {mobileMenuOpen
            ? "✕"
            : "☰"}
        </button>
      </header>

      {/* MOBILE MENU */}

      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-50 border-b border-[#dfe6d9] bg-white p-4 shadow-lg lg:hidden">
          <nav className="space-y-1">
            <Link
              href="/settings"
              onClick={() =>
                setMobileMenuOpen(
                  false
                )
              }
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                pathname.startsWith(
                  "/settings"
                )
                  ? "bg-[#294d3b] text-[#f7f8ec] shadow-[0_6px_16px_-8px_#294d3b80]"
                  : "text-gray-600"
              }`}
            >
              <span>
                ⚙️
              </span>

              Settings
            </Link>
          </nav>

          <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#f5f6ef] p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dfe9e1] text-sm font-semibold text-[#45634c]">
              {firstName
                .charAt(0)
                .toUpperCase()}
            </div>

            <p className="truncate text-sm font-medium text-gray-700">
              {displayName}
            </p>
          </div>
          {signOutAction}
        </div>
      )}

      {/* PAGE CONTENT */}

      <div className="workspace-surface relative pb-24 lg:pb-0 lg:pl-64">
        <div aria-hidden="true" className="workspace-decor pointer-events-none fixed inset-0 -z-0 lg:left-64" />
        <div className="relative z-[1]">
        <BetaWelcome />
        {children}
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}

      <nav aria-label="Workspace" className="fixed inset-x-2 bottom-2 z-40 grid grid-cols-6 rounded-2xl border border-[#d9e2d5] bg-[#fcfdf8]/95 p-1 shadow-[0_16px_40px_-16px_#294d3b80] backdrop-blur lg:hidden">
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
              className={`relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-[9px] font-semibold transition active:scale-95 ${active ? "bg-[#294d3b] text-white shadow-sm" : "text-[#61715f] hover:bg-[#edf2e5]"}`}>
              <span aria-hidden="true" className="text-base leading-none">{item.icon}</span>
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
    </ToastProvider>
  );
}

