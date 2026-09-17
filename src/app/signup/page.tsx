"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    router.push("/login?message=check-email");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9f6] px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mb-4 text-3xl font-bold text-[#3f5f45]">
            Momentum
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Start building momentum.
          </h1>

          <p className="mt-3 text-gray-500">
            Small focused actions. Consistent progress.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            Create your account
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Set up your space and start focusing.
          </p>

          <form onSubmit={handleSignup} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Name
              </label>

              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Mac"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#52735a] focus:ring-2 focus:ring-[#52735a]/15"
              />
            </div>

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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
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
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
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
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[#45634c] hover:underline"
            >
              Log in
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