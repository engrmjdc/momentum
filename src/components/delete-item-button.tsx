"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast-provider";

type Props = { kind: "goal" | "project"; id: string; name: string };

export default function DeleteItemButton({ kind, id, name }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const busy = useRef(false);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = kind === "goal" ? "goal" : "project";

  async function remove() {
    if (busy.current) return;
    busy.current = true;
    setDeleting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Please sign in again.");
      const result = kind === "goal"
        ? await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id).select("id").single()
        : await supabase.from("projects").delete().eq("id", id).eq("user_id", user.id).select("id").single();
      if (result.error) throw result.error;
      showToast(`${kind === "goal" ? "Goal" : "Project"} deleted.`);
      router.replace(kind === "goal" ? "/goals" : "/projects");
    } catch (caught) {
      console.error(`Unable to delete ${label}:`, caught);
      setError(`Could not delete this ${label}. Please try again.`);
      showToast(`Could not delete this ${label}.`, "error");
      busy.current = false;
      setDeleting(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setError(null); setOpen(true); }}
        className="rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
        Delete {kind === "goal" ? "Goal" : "Project"}
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#17251d]/55 p-5 backdrop-blur-sm" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target && !deleting) setOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description"
            className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-2xl sm:p-8">
            <div aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl">🗑️</div>
            <h2 id="delete-title" className="mt-5 text-xl font-semibold text-[#233b2c]">Delete this {label}?</h2>
            <p id="delete-description" className="mt-3 text-sm leading-6 text-gray-600">
              <strong className="font-semibold text-gray-800">{name}</strong> will be permanently deleted. {kind === "goal"
                ? "Its schedules and completion entries will also be removed. Related projects and past focus sessions will remain, but will no longer be linked to this goal."
                : "All tasks inside this project will also be permanently deleted."}
            </p>
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={deleting} onClick={() => setOpen(false)}
                className="rounded-xl px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Keep {kind === "goal" ? "Goal" : "Project"}</button>
              <button type="button" disabled={deleting} onClick={remove}
                className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-60">
                {deleting ? "Deleting…" : `Yes, delete ${label}`}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
