"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth-layout";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please retype your password.");
      return;
    }
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
    <AuthLayout>
      <div className="w-full">
        <div className="mb-7 text-left">
          

          <h1 className="text-3xl font-semibold tracking-tight text-[#233b2c]">
            Start building momentum.
          </h1>

          <p className="mt-3 text-gray-500">
            Small focused actions. Consistent progress.
          </p>
        </div>

        <div className="">
          <h2 className="text-xl font-semibold text-[#233b2c]">
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
                placeholder="Enter your name"
                className="w-full rounded-xl border border-[#dbe3d7] bg-[#fafbf7] px-4 py-3 text-[#233b2c] outline-none transition focus:border-[#52735a] focus:ring-2 focus:ring-[#52735a]/15"
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
                className="w-full rounded-xl border border-[#dbe3d7] bg-[#fafbf7] px-4 py-3 text-[#233b2c] outline-none transition focus:border-[#52735a] focus:ring-2 focus:ring-[#52735a]/15"
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
                className="w-full rounded-xl border border-[#dbe3d7] bg-[#fafbf7] px-4 py-3 text-[#233b2c] outline-none transition focus:border-[#52735a] focus:ring-2 focus:ring-[#52735a]/15"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Retype your password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-[#dbe3d7] bg-[#fafbf7] px-4 py-3 text-[#233b2c] outline-none transition focus:border-[#52735a] focus:ring-2 focus:ring-[#52735a]/15"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#45634c] shadow-[0_5px_15px_-5px_#45634c70] px-4 py-3 font-medium text-white transition hover:bg-[#395440] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#45634c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-gray-500">Read how Momentum handles your data in our <Link href="/privacy" className="font-medium text-[#45634c] underline">privacy notice</Link>.</p>
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
    </AuthLayout>
  );
}