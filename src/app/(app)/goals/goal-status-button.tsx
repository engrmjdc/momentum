"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function GoalStatusButton({
  goalId, goalName, isActive,
}: {
  goalId: string;
  goalName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError("Please sign in again to change this goal.");
        return;
      }
      const { error: updateError } = await supabase
        .from("goals")
        .update({ is_active: !isActive })
        .eq("id", goalId)
        .eq("user_id", user.id)
        .eq("is_active", isActive)
        .select("id")
        .single();
      if (updateError) {
        setError("Could not change this goal. Refresh and try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={changeStatus}
        disabled={saving}
        aria-label={`${isActive ? "Pause" : "Resume"} ${goalName}`}
        className="rounded-xl border border-[#dce7de] px-4 py-2 text-sm font-medium text-[#45634c] transition hover:bg-[#edf3ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45634c] disabled:cursor-wait disabled:opacity-60"
      >
        {saving ? (isActive ? "Pausing…" : "Resuming…") : (isActive ? "Pause Goal" : "Resume Goal")}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
