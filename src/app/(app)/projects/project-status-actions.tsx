"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProjectStatus = "active" | "completed" | "archived";
const actions: Record<ProjectStatus, { label: string; target: ProjectStatus }[]> = {
  active: [
    { label: "Complete", target: "completed" },
    { label: "Archive", target: "archived" },
  ],
  completed: [
    { label: "Reopen", target: "active" },
    { label: "Archive", target: "archived" },
  ],
  archived: [{ label: "Restore", target: "active" }],
};

export default function ProjectStatusActions({ projectId, projectName, status }: {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState<ProjectStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(target: ProjectStatus) {
    if (busy.current) return;
    busy.current = true;
    setPending(target);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError("Please sign in again to change this project.");
        return;
      }
      const { error: updateError } = await supabase.from("projects")
        .update({ status: target })
        .eq("id", projectId)
        .eq("user_id", user.id)
        .eq("status", status)
        .select("id")
        .single();
      if (updateError) {
        setError("Could not change this project. Refresh and try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {actions[status].map((action) => (
          <button key={action.target} type="button"
            onClick={() => changeStatus(action.target)}
            disabled={pending !== null}
            aria-label={`${action.label} ${projectName}`}
            className="rounded-xl border border-[#dce7de] px-4 py-2 text-sm font-medium text-[#45634c] transition hover:bg-[#edf3ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45634c] disabled:cursor-wait disabled:opacity-60"
          >
            {pending === action.target ? "Saving…" : action.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
