"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/auth-layout";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const message = searchParams.get("message");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        throw signInError;
      }

      router.replace("/today");
      router.refresh();
    } catch (error) {
      console.error("Login failed:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to sign in.";

      setError(message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="w-full">
        <div className="text-left">
          

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#233b2c]">
            Welcome back.
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Continue building momentum toward what matters.
          </p>
        </div>

        <div className="mt-7">
          {message === "check-email" && (
            <div className="mb-5 rounded-xl bg-[#eef4ef] p-4 text-sm leading-6 text-[#45634c]">
              Check your email to confirm your account, then sign in.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
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
                className="mt-2 w-full rounded-xl border border-[#dbe3d7] bg-[#fafbf7] px-4 py-3 text-[#233b2c] outline-none transition focus:border-[#52735a] focus:ring-2 focus:ring-[#52735a]/15"
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
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
                placeholder="Enter your password"
                className="mt-2 w-full rounded-xl border border-[#dbe3d7] bg-[#fafbf7] px-4 py-3 text-[#233b2c] outline-none transition focus:border-[#52735a] focus:ring-2 focus:ring-[#52735a]/15"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full rounded-xl bg-[#45634c] shadow-[0_5px_15px_-5px_#45634c70] px-5 py-3 font-medium text-white transition hover:bg-[#395440] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#45634c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-[#45634c] hover:underline">Forgot password?</Link>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-[#45634c] hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}

function LoginLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9f6]">
      <p className="text-sm text-gray-500">
        Loading...
      </p>
    </main>
  );
}
