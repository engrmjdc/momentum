"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    setError(null);
    if (password.length < 8 || password !== String(form.get("confirm_password"))) {
      setError("Use at least 8 characters and make sure both passwords match.");
      return;
    }
    busy.current = true;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      // Keep success visible even if clearing the local session fails.
      try { await supabase.auth.signOut({ scope: "local" }); } catch { /* Password was saved. */ }
      setSaved(true);
    } catch {
      setError("Could not complete the request. Try signing in with your new password before requesting another link.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9f6] px-5 py-10 text-[#171717]">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="font-bold text-[#45634c]">Momentum</p>
        <h1 className="mt-5 text-2xl font-semibold">{saved ? "Password updated" : "Choose a new password"}</h1>
        {saved ? (
          <div>
            <p role="status" className="mt-3 text-sm leading-6 text-gray-600">Your new password is saved. Use it the next time you sign in.</p>
            <Link href="/login" className="mt-6 inline-block rounded-xl bg-[#45634c] px-5 py-3 text-sm font-semibold text-white">Go to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6">
            <fieldset disabled={saving} className="space-y-5">
              <legend className="sr-only">New password</legend>
              <div>
                <label htmlFor="new-password" className="text-sm font-medium">New password</label>
                <input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-describedby="password-help" className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-2 focus:outline-[#45634c]" />
                <p id="password-help" className="mt-2 text-xs text-gray-500">Use at least 8 characters.</p>
              </div>
              <div>
                <label htmlFor="confirm-password" className="text-sm font-medium">Confirm new password</label>
                <input id="confirm-password" name="confirm_password" type="password" autoComplete="new-password" required minLength={8} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-2 focus:outline-[#45634c]" />
              </div>
            </fieldset>
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={saving} className="mt-6 w-full rounded-xl bg-[#45634c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#354e3b] disabled:cursor-wait disabled:opacity-60">{saving ? "Saving…" : "Save new password"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
