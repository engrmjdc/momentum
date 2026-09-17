"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Goal = {
  id: string;
  name: string;
  icon: string | null;
  default_duration_minutes: number | null;
};

type Props = {
  userId: string;
  goals: Goal[];
  defaultFocusMinutes: number;
  breakMinutes: number;
  presetLabel: string;
};

type TimerStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "cancelled";

/*
 * Development-only timer shortcut.
 *
 * npm run dev  -> 1 minute
 * production   -> real configured duration
 */
const DEV_TEST_MODE =
  process.env.NODE_ENV === "development";

const DEV_TEST_DURATION_MINUTES = 1;

export default function FocusTimer({
  userId,
  goals,
  defaultFocusMinutes,
  breakMinutes,
  presetLabel,
}: Props) {
  const router = useRouter();

  const [selectedGoalId, setSelectedGoalId] =
    useState<string>("");

  const [durationMinutes, setDurationMinutes] =
    useState(defaultFocusMinutes);

  const [remainingSeconds, setRemainingSeconds] =
    useState(defaultFocusMinutes * 60);

  const [status, setStatus] =
    useState<TimerStatus>("idle");

  const [sessionId, setSessionId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const endTimeRef = useRef<number | null>(null);

  const selectedGoal =
    goals.find((goal) => goal.id === selectedGoalId) ??
    null;

  /*
   * Determine the timer duration.
   *
   * Development uses one minute so we can test the
   * complete-session flow quickly.
   */
  useEffect(() => {
    if (status !== "idle") {
      return;
    }

    const minutes = DEV_TEST_MODE
      ? DEV_TEST_DURATION_MINUTES
      : selectedGoal?.default_duration_minutes ??
        defaultFocusMinutes;

    setDurationMinutes(minutes);
    setRemainingSeconds(minutes * 60);
  }, [
    selectedGoal,
    defaultFocusMinutes,
    status,
  ]);

  /*
   * Countdown.
   *
   * We use an absolute timestamp instead of subtracting
   * one second every interval. This helps prevent timer
   * drift when the browser throttles background tabs.
   */
  useEffect(() => {
    if (status !== "running") {
      return;
    }

    function updateTimer() {
      if (!endTimeRef.current) {
        return;
      }

      const remaining = Math.max(
        0,
        Math.ceil(
          (endTimeRef.current - Date.now()) / 1000
        )
      );

      setRemainingSeconds(remaining);

      if (remaining === 0) {
        endTimeRef.current = null;
        setStatus("completed");
      }
    }

    updateTimer();

    const interval = window.setInterval(
      updateTimer,
      250
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [status]);

  /*
   * When the timer naturally reaches zero, update
   * the existing database session as completed.
   */
  useEffect(() => {
    if (
      status !== "completed" ||
      !sessionId ||
      isSaving
    ) {
      return;
    }

    async function saveCompletedSession() {
      setIsSaving(true);
      setError(null);

      try {
        const supabase = createClient();

        const { error: updateError } =
          await supabase
            .from("focus_sessions")
            .update({
              status: "completed",
              actual_duration_seconds:
                durationMinutes * 60,
              completed_at:
                new Date().toISOString(),
            })
            .eq("id", sessionId)
            .eq("user_id", userId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        router.refresh();
      } catch (caughtError) {
        console.error(
          "Unable to complete focus session:",
          caughtError
        );

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to save your focus session."
        );
      } finally {
        setIsSaving(false);
      }
    }

    void saveCompletedSession();
  }, [
    status,
    sessionId,
    durationMinutes,
    userId,
    router,
    isSaving,
  ]);

  /*
   * Create the database session before starting
   * the countdown.
   */
  async function startFocus() {
    if (!selectedGoalId) {
      setError("Choose a goal before starting.");
      return;
    }

    if (isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const supabase = createClient();

      const { data, error: insertError } =
        await supabase
          .from("focus_sessions")
          .insert({
            user_id: userId,
            goal_id: selectedGoalId,
            planned_duration_minutes:
              durationMinutes,
            actual_duration_seconds: 0,
            status: "in_progress",
          })
          .select("id")
          .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      if (!data?.id) {
        throw new Error(
          "Focus session was created without an ID."
        );
      }

      setSessionId(data.id);

      endTimeRef.current =
        Date.now() + remainingSeconds * 1000;

      setStatus("running");
    } catch (caughtError) {
      console.error(
        "Unable to start focus session:",
        caughtError
      );

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start focus session."
      );
    } finally {
      setIsSaving(false);
    }
  }

  /*
   * Pause locally.
   *
   * The database session remains in_progress until
   * the user completes or cancels the session.
   */
  function pauseFocus() {
    if (status !== "running") {
      return;
    }

    endTimeRef.current = null;
    setStatus("paused");
  }

  /*
   * Resume from the exact remaining duration.
   */
  function resumeFocus() {
    if (status !== "paused") {
      return;
    }

    endTimeRef.current =
      Date.now() + remainingSeconds * 1000;

    setStatus("running");
  }

  /*
   * End the session before completion.
   *
   * Cancelled sessions retain their actual elapsed
   * focus time but will not count as completed sessions.
   */
  async function cancelFocus() {
    if (isSaving) {
      return;
    }

    if (!sessionId) {
      resetTimer();
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const elapsedSeconds = Math.max(
        0,
        durationMinutes * 60 - remainingSeconds
      );

      const supabase = createClient();

      const { error: updateError } =
        await supabase
          .from("focus_sessions")
          .update({
            status: "cancelled",
            actual_duration_seconds:
              elapsedSeconds,
          })
          .eq("id", sessionId)
          .eq("user_id", userId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      endTimeRef.current = null;
      setStatus("cancelled");
    } catch (caughtError) {
      console.error(
        "Unable to cancel focus session:",
        caughtError
      );

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to cancel focus session."
      );
    } finally {
      setIsSaving(false);
    }
  }

  /*
   * Prepare a fresh session.
   */
  function resetTimer() {
    const minutes = DEV_TEST_MODE
      ? DEV_TEST_DURATION_MINUTES
      : selectedGoal?.default_duration_minutes ??
        defaultFocusMinutes;

    setSessionId(null);
    setStatus("idle");
    setDurationMinutes(minutes);
    setRemainingSeconds(minutes * 60);
    setError(null);

    endTimeRef.current = null;
  }

  /*
   * Timer display.
   */
  const minutes = Math.floor(
    remainingSeconds / 60
  );

  const seconds = remainingSeconds % 60;

  const formattedTime = `${String(
    minutes
  ).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;

  /*
   * Circular progress.
   */
  const totalSeconds = durationMinutes * 60;

  const progress =
    totalSeconds > 0
      ? ((totalSeconds - remainingSeconds) /
          totalSeconds) *
        100
      : 0;

  const radius = 118;

  const circumference =
    2 * Math.PI * radius;

  const normalizedProgress = Math.min(
    Math.max(progress, 0),
    100
  );

  const dashOffset =
    circumference -
    (normalizedProgress / 100) *
      circumference;

  /*
   * Completed screen.
   */
  if (status === "completed") {
    return (
      <CompletionScreen
        goal={selectedGoal}
        durationMinutes={durationMinutes}
        isSaving={isSaving}
        error={error}
        resetTimer={resetTimer}
      />
    );
  }

  /*
   * Cancelled screen.
   */
  if (status === "cancelled") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f9f6] px-5">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl">
            🌿
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">
            Session ended.
          </h1>

          <p className="mt-3 leading-7 text-gray-500">
            No problem. Progress is about returning,
            not being perfect.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={resetTimer}
              className="rounded-2xl bg-[#45634c] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#395440]"
            >
              Start another session
            </button>

            <Link
              href="/today"
              className="rounded-2xl px-5 py-3 text-sm font-medium text-gray-500 transition hover:bg-gray-100"
            >
              Back to Today
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const timerActive =
    status === "running" ||
    status === "paused";

  return (
    <main className="min-h-screen bg-[#f7f9f6] px-5 py-7 sm:px-8">
      <div className="mx-auto max-w-5xl">

        {/* Navigation */}

        <header className="flex items-center justify-between">
          <Link
            href="/today"
            className="font-bold text-[#45634c]"
          >
            🌱 Momentum
          </Link>

          <Link
            href="/today"
            className="rounded-xl px-4 py-2 text-sm text-gray-500 transition hover:bg-white"
          >
            ← Today
          </Link>
        </header>

        <div className="mx-auto mt-10 max-w-xl text-center sm:mt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6c8772]">
            Focus Session
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Give one thing your attention.
          </h1>

          <p className="mx-auto mt-3 max-w-md leading-7 text-gray-500">
            Choose what you&apos;re working on and let
            everything else wait.
          </p>

          {/* Development notice */}

          {DEV_TEST_MODE && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
              Development mode · Timer shortened to 1
              minute for testing.
            </div>
          )}

          {/* Goal selector */}

          {!timerActive && (
            <div className="mt-8 text-left">
              <label
                htmlFor="focus-goal"
                className="text-sm font-medium text-gray-700"
              >
                What are you focusing on?
              </label>

              <select
                id="focus-goal"
                value={selectedGoalId}
                onChange={(event) => {
                  setSelectedGoalId(
                    event.target.value
                  );

                  setError(null);
                }}
                disabled={isSaving}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-gray-900 outline-none transition focus:border-[#52735a] focus:ring-2 focus:ring-[#52735a]/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  Choose a goal...
                </option>

                {goals.map((goal) => (
                  <option
                    key={goal.id}
                    value={goal.id}
                  >
                    {goal.icon || "🎯"}{" "}
                    {goal.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selected goal */}

          {selectedGoal && (
            <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#eef4ef] px-4 py-2 text-sm font-medium text-[#45634c]">
              <span>
                {selectedGoal.icon || "🎯"}
              </span>

              <span>
                {selectedGoal.name}
              </span>
            </div>
          )}

          {/* Timer */}

          <div className="relative mx-auto mt-9 flex h-[290px] w-[290px] items-center justify-center">
            <svg
              viewBox="0 0 270 270"
              className="absolute inset-0 h-full w-full -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="135"
                cy="135"
                r={radius}
                fill="none"
                stroke="#e5ebe6"
                strokeWidth="8"
              />

              <circle
                cx="135"
                cy="135"
                r={radius}
                fill="none"
                stroke="#52735a"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={
                  circumference
                }
                strokeDashoffset={
                  dashOffset
                }
                className="transition-[stroke-dashoffset] duration-500"
              />
            </svg>

            <div className="relative text-center">
              <p className="text-6xl font-semibold tracking-[-0.05em] text-[#45634c]">
                {formattedTime}
              </p>

              <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                {status === "paused"
                  ? "Paused"
                  : status === "running"
                    ? "Stay focused"
                    : "Ready"}
              </p>
            </div>
          </div>

          {/* Controls */}

          <div className="mx-auto mt-8 max-w-sm">
            {status === "idle" && (
              <button
                type="button"
                onClick={startFocus}
                disabled={
                  !selectedGoalId ||
                  isSaving
                }
                className="w-full rounded-2xl bg-[#45634c] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#395440] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSaving
                  ? "Starting..."
                  : "Start Focus"}
              </button>
            )}

            {status === "running" && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={pauseFocus}
                  disabled={isSaving}
                  className="rounded-2xl bg-[#45634c] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#395440] disabled:opacity-50"
                >
                  Pause
                </button>

                <button
                  type="button"
                  onClick={cancelFocus}
                  disabled={isSaving}
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-medium text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {isSaving
                    ? "Ending..."
                    : "End session"}
                </button>
              </div>
            )}

            {status === "paused" && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={resumeFocus}
                  disabled={isSaving}
                  className="rounded-2xl bg-[#45634c] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#395440] disabled:opacity-50"
                >
                  Resume
                </button>

                <button
                  type="button"
                  onClick={cancelFocus}
                  disabled={isSaving}
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-medium text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {isSaving
                    ? "Ending..."
                    : "End session"}
                </button>
              </div>
            )}
          </div>

          {/* Error */}

          {error && (
            <div
              role="alert"
              className="mx-auto mt-5 max-w-sm rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* Focus preference */}

          <p className="mt-6 text-sm text-gray-400">
            {DEV_TEST_MODE ? (
              <>
                Testing duration · 1 min
              </>
            ) : (
              <>
                {presetLabel} ·{" "}
                {durationMinutes} min focus ·{" "}
                {breakMinutes} min break
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}

function CompletionScreen({
  goal,
  durationMinutes,
  isSaving,
  error,
  resetTimer,
}: {
  goal: Goal | null;
  durationMinutes: number;
  isSaving: boolean;
  error: string | null;
  resetTimer: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9f6] px-5">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#e7eee8] text-4xl text-[#45634c]">
          ✓
        </div>

        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-[#6c8772]">
          Focus Complete
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
          Nice work.
        </h1>

        <p className="mt-3 leading-7 text-gray-500">
          You focused for{" "}
          <strong className="font-semibold text-gray-700">
            {durationMinutes}{" "}
            {durationMinutes === 1
              ? "minute"
              : "minutes"}
          </strong>

          {goal ? (
            <>
              {" "}
              on{" "}
              <strong className="font-semibold text-gray-700">
                {goal.icon || "🎯"}{" "}
                {goal.name}
              </strong>
            </>
          ) : null}

          .
        </p>

        {isSaving && (
          <p className="mt-5 text-sm text-gray-400">
            Saving your progress...
          </p>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={resetTimer}
            disabled={isSaving}
            className="rounded-2xl bg-[#45634c] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#395440] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start another session
          </button>

          <Link
            href="/today"
            className="rounded-2xl px-5 py-3 text-sm font-medium text-gray-500 transition hover:bg-gray-100"
          >
            Back to Today
          </Link>
        </div>
      </div>
    </main>
  );
}