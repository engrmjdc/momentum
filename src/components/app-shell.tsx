"use client";

import Link from "next/link";
import BetaWelcome from "./beta-welcome";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AppShellProps = {
  children: React.ReactNode;
  displayName: string;
};

const navigation = [
  {
    name: "Today",
    href: "/today",
    icon: "☀️",
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
    name: "Progress",
    href: "/progress",
    icon: "📈",
  },
];

export default function AppShell({
  children,
  displayName,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const signingOut = useRef(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

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
      router.refresh();
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
    <div className="min-h-screen bg-[#f5f6ef]">

      {/* DESKTOP SIDEBAR */}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[#dfe6d9] bg-[#fcfdf8] lg:flex lg:flex-col">

        {/* LOGO */}

        <div className="flex h-20 items-center border-b border-gray-100 px-7">
          <Link
            href="/today"
            className="flex items-center gap-2 text-lg font-bold text-[#45634c]"
          >
            <span>
              🌱
            </span>

            <span>
              Momentum
            </span>
          </Link>
        </div>

        {/* NAVIGATION */}

        <nav aria-label="Workspace" className="flex-1 px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#74816f]">
            Workspace
          </p>

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
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-[#294d3b] text-[#f7f8ec] shadow-[0_6px_16px_-8px_#294d3b80]"
                      : "text-[#61715f] hover:bg-[#edf2e5] hover:text-[#294d3b]"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center text-base">
                    {item.icon}
                  </span>

                  <span>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="mt-8 rounded-2xl border border-[#dde6d2] bg-[#edf2e5] p-4">
            <span aria-hidden="true" className="text-xl">🌿</span>
            <p className="mt-3 text-sm font-semibold text-[#294d3b]">Make room for progress.</p>
            <p className="mt-2 text-xs leading-5 text-[#61715f]">A few focused minutes can be a good place to start.</p>
            <Link href="/focus" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#294d3b] underline decoration-[#a6ba92] underline-offset-4">Find your focus <span aria-hidden="true">↗</span></Link>
          </div>
        </nav>

        {/* BOTTOM */}

        <div className="border-t border-gray-100 p-4">
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

          <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#f5f6ef] p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dfe9e1] text-sm font-semibold text-[#45634c]">
              {firstName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-700">
                {displayName}
              </p>

              <p className="text-xs text-[#74816f]">
                Momentum
              </p>
            </div>
          </div>
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
                  onClick={() =>
                    setMobileMenuOpen(
                      false
                    )
                  }
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                    active
                      ? "bg-[#294d3b] text-[#f7f8ec] shadow-[0_6px_16px_-8px_#294d3b80]"
                      : "text-gray-600"
                  }`}
                >
                  <span>
                    {item.icon}
                  </span>

                  {item.name}
                </Link>
              );
            })}

            <div className="my-2 border-t border-gray-100" />

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

      <div className="lg:pl-64">
        <BetaWelcome />
        {children}
      </div>
    </div>
  );
}