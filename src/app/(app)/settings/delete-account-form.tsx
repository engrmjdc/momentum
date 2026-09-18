"use client";

import { useRef, useState, type FormEvent } from "react";
import { deleteAccount } from "./delete-account";
import { createClient } from "@/lib/supabase/client";

export default function DeleteAccountForm() {
  const busy = useRef(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = new FormData(event.currentTarget);
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await deleteAccount(
        String(form.get("password") ?? ""), String(form.get("confirmation") ?? "")
      );
      if (!result.success) {
        setError(result.message ?? "Could not delete your account.");
        return;
      }
      try { await createClient().auth.signOut({ scope: "local" }); } catch { /* Account is already deleted. */ }
      window.location.replace("/login?message=account-deleted");
    } catch {
      setError("Could not complete the request. Try signing in again to check your account before retrying.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-gray-900">Delete Account</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">Permanently delete your account and all your goals, schedules, focus history, completions, projects, and tasks. This cannot be undone.</p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-5 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50">Delete my account</button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 max-w-md">
          <fieldset disabled={saving} className="space-y-4">
            <legend className="sr-only">Confirm account deletion</legend>
            <div>
              <label htmlFor="delete-password" className="text-sm font-medium text-gray-700">Current password</label>
              <input id="delete-password" name="password" type="password" autoComplete="current-password" required className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:outline-2 focus:outline-red-700" />
            </div>
            <div>
              <label htmlFor="delete-confirmation" className="text-sm font-medium text-gray-700">Type DELETE to confirm</label>
              <input id="delete-confirmation" name="confirmation" type="text" required pattern="DELETE" autoComplete="off" spellCheck={false} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:outline-2 focus:outline-red-700" />
            </div>
          </fieldset>
          {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="rounded-xl bg-red-700 px-4 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-wait disabled:opacity-60">{saving ? "Deleting…" : "Permanently delete account"}</button>
            <button type="button" disabled={saving} onClick={() => { setOpen(false); setError(null); }} className="rounded-xl px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60">Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
}
