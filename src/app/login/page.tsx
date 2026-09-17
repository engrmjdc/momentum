"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkEmail = searchParams.get("message") === "check-email";

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9f6] px-6 py-12">
      <div className="w-full max-w-md">

        <div className="mb-10 text-center">
          <div className="mb-4 text-3xl font-bold text-[#3f5f45]">
            Momentum
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Welcome back.
          </h1>

          <p className="mt-3 text-gray-500">
            Continue where you left off.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">

          {checkEmail && (
            <div className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
              Account created. Check your email to confirm your account before
              logging in.
            </div>
          )}

          <h2 className="text-xl font-semibold text-gray-900">
            Log in
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Enter your details to continue.
          </p>

          <form onSubmit={handleLogin} className="mt-7 space-y-5">

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#52735a] focus:ring-2 focus:ring-[#52735a]/15"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#52735a] focus:ring-2 focus:ring-[#52735a]/15"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#45634c] px-4 py-3 font-medium text-white transition hover:bg-[#395440] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>

          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            New to Momentum?{" "}
            <Link
              href="/signup"
              className="font-medium text-[#45634c] hover:underline"
            >
              Create an account
            </Link>
          </p>

        </div>

        <p className="mt-8 text-center text-sm text-gray-400">
          Focus today. A better tomorrow.
        </p>

      </div>
    </main>
  );
}