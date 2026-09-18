"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const busy = useRef(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    busy.current = true;
    setSending(true);
    setError(null);
    try {
      const { error: requestError } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/recovery`,
      });
      if (requestError) {
        setError(requestError.status === 429
          ? "Too many requests. Wait a little before trying again."
          : "Could not send a reset email. Please try again later.");
        return;
      }
      setSent(true);
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9f6] px-5 py-10 text-[#171717]">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="font-bold text-[#45634c]">Momentum</p>
        <h1 className="mt-5 text-2xl font-semibold">Forgot password?</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">We’ll send you a link to choose a new password.</p>
        {sent ? (
          <div role="status" className="mt-5 rounded-xl bg-[#edf3ee] p-4 text-sm leading-6 text-[#45634c]">If an account exists for that email, a reset link will be sent. Check your inbox and spam folder. Open the newest link in the same browser and on the same device where you requested it.</div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6">
            <label htmlFor="reset-email" className="text-sm font-medium">Email</label>
            <input id="reset-email" name="email" type="email" autoComplete="email" required disabled={sending} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-2 focus:outline-[#45634c]" />
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={sending} className="mt-5 w-full rounded-xl bg-[#45634c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#354e3b] disabled:cursor-wait disabled:opacity-60">{sending ? "Sending…" : "Send reset link"}</button>
          </form>
        )}
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-[#45634c] hover:underline">← Back to Sign In</Link>
      </div>
    </main>
  );
}
