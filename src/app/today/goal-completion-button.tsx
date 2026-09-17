"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  goalId: string;
  goalName: string;
};

export default function GoalCompletionButton({
  userId,
  goalId,
  goalName,
}: Props) {
  const router = useRouter();

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [showSuccess, setShowSuccess] =
    useState(false);

  async function markComplete() {
    if (isSaving) {
      return;
    }

    setError(null);
    setShowSuccess(false);
    setIsSaving(true);

    try {
      const supabase = createClient();

      const { error: insertError } =
        await supabase
          .from("goal_completions")
          .insert({
            user_id: userId,
            goal_id: goalId,
            quantity: 1,
          });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setShowSuccess(true);

      /*
       * Refresh the server-rendered dashboard so the
       * newly recorded completion appears immediately.
       */
      router.refresh();

      window.setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (caughtError) {
      console.error(
        `Unable to record completion for ${goalName}:`,
        caughtError
      );

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to record completion."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={markComplete}
        disabled={isSaving}
        className="w-full rounded-xl border border-[#dce7de] bg-white px-4 py-2.5 text-sm font-medium text-[#45634c] transition hover:bg-[#eef4ef] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving
          ? "Saving..."
          : showSuccess
            ? "✓ Completed"
            : "+ Mark 1 complete"}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-2 text-xs text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}