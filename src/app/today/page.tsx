import Link from "next/link";
import { redirect } from "next/navigation";

import GoalCompletionButton from "./goal-completion-button";

import { createClient } from "@/lib/supabase/server";

import {
  formatLocalDate,
  getLocalDayOfWeek,
  getLocalDayRange,
  getLocalHour,
  getLocalWeekRange,
} from "@/lib/date-utils";

type GoalSchedule = {
  day_of_week: number;
  duration_minutes: number | null;
};

type Goal = {
  id: string;
  name: string;
  icon: string | null;

  measurement_type:
    | "sessions"
    | "minutes"
    | "count";

  weekly_target: number;

  default_duration_minutes:
    | number
    | null;

  goal_schedules: GoalSchedule[];
};

type FocusPreference = {
  preset:
    | "pomodoro"
    | "deep"
    | "custom";

  custom_focus_minutes: number;
  custom_break_minutes: number;
};

type FocusSession = {
  goal_id: string | null;
  actual_duration_seconds: number;

  status:
    | "in_progress"
    | "completed"
    | "cancelled";

  completed_at: string | null;
};

type GoalCompletion = {
  goal_id: string;
  quantity: number;
  completed_at: string;
};

type GoalProgress = {
  value: number;
  percentage: number;
};

type TodayProgress = {
  value: number;
  target: number;
  completed: boolean;
};

export default async function TodayPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * PROFILE
   */

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      `
        display_name,
        timezone
      `
    )
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error(
      "Unable to load profile:",
      profileError
    );
  }

  const timezone =
    profile?.timezone ||
    "Asia/Manila";

  const now = new Date();

  /*
   * LOCAL DATE BOUNDARIES
   */

  const dayOfWeek =
    getLocalDayOfWeek(
      now,
      timezone
    );

  const dayRange =
    getLocalDayRange(
      now,
      timezone
    );

  const weekRange =
    getLocalWeekRange(
      now,
      timezone
    );

  /*
   * LOAD DASHBOARD DATA
   */

  const [
    goalsResult,
    preferenceResult,
    weeklyFocusResult,
    weeklyCompletionResult,
    todayFocusResult,
    todayCompletionResult,
  ] = await Promise.all([
    /*
     * Active goals + schedules.
     */
    supabase
      .from("goals")
      .select(`
        id,
        name,
        icon,
        measurement_type,
        weekly_target,
        default_duration_minutes,
        goal_schedules (
          day_of_week,
          duration_minutes
        )
      `)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order(
        "created_at",
        {
          ascending: true,
        }
      ),

    /*
     * Focus preference.
     */
    supabase
      .from(
        "focus_preferences"
      )
      .select(`
        preset,
        custom_focus_minutes,
        custom_break_minutes
      `)
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle(),

    /*
     * Completed focus sessions
     * for the current week.
     */
    supabase
      .from(
        "focus_sessions"
      )
      .select(`
        goal_id,
        actual_duration_seconds,
        status,
        completed_at
      `)
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "status",
        "completed"
      )
      .gte(
        "completed_at",
        weekRange.start
      )
      .lt(
        "completed_at",
        weekRange.end
      ),

    /*
     * Explicit count completions
     * for the current week.
     */
    supabase
      .from(
        "goal_completions"
      )
      .select(`
        goal_id,
        quantity,
        completed_at
      `)
      .eq(
        "user_id",
        user.id
      )
      .gte(
        "completed_at",
        weekRange.start
      )
      .lt(
        "completed_at",
        weekRange.end
      ),

    /*
     * Today's completed focus
     * sessions.
     */
    supabase
      .from(
        "focus_sessions"
      )
      .select(`
        goal_id,
        actual_duration_seconds,
        status,
        completed_at
      `)
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "status",
        "completed"
      )
      .gte(
        "completed_at",
        dayRange.start
      )
      .lt(
        "completed_at",
        dayRange.end
      ),

    /*
     * Today's explicit count
     * completions.
     */
    supabase
      .from(
        "goal_completions"
      )
      .select(`
        goal_id,
        quantity,
        completed_at
      `)
      .eq(
        "user_id",
        user.id
      )
      .gte(
        "completed_at",
        dayRange.start
      )
      .lt(
        "completed_at",
        dayRange.end
      ),
  ]);

  /*
   * Report query failures without
   * crashing the whole dashboard.
   */

  if (goalsResult.error) {
    console.error(
      "Unable to load goals:",
      goalsResult.error
    );
  }

  if (
    preferenceResult.error
  ) {
    console.error(
      "Unable to load focus preferences:",
      preferenceResult.error
    );
  }

  if (
    weeklyFocusResult.error
  ) {
    console.error(
      "Unable to load weekly focus sessions:",
      weeklyFocusResult.error
    );
  }

  if (
    weeklyCompletionResult.error
  ) {
    console.error(
      "Unable to load weekly goal completions:",
      weeklyCompletionResult.error
    );
  }

  if (
    todayFocusResult.error
  ) {
    console.error(
      "Unable to load today's focus sessions:",
      todayFocusResult.error
    );
  }

  if (
    todayCompletionResult.error
  ) {
    console.error(
      "Unable to load today's goal completions:",
      todayCompletionResult.error
    );
  }

  /*
   * NORMALIZED DATA
   */

  const goals =
    (goalsResult.data ??
      []) as Goal[];

  const focusPreference =
    preferenceResult.data as
      | FocusPreference
      | null;

  const weeklyFocusSessions =
    (weeklyFocusResult.data ??
      []) as FocusSession[];

  const weeklyGoalCompletions =
    (weeklyCompletionResult.data ??
      []) as GoalCompletion[];

  const todayFocusSessions =
    (todayFocusResult.data ??
      []) as FocusSession[];

  const todayGoalCompletions =
    (todayCompletionResult.data ??
      []) as GoalCompletion[];

  /*
   * HEADER
   */

  const formattedDate =
    formatLocalDate(
      now,
      timezone
    );

  const localHour =
    getLocalHour(
      now,
      timezone
    );

  const greeting =
    localHour < 12
      ? "Good morning"
      : localHour < 18
        ? "Good afternoon"
        : "Good evening";

  const displayName =
    profile?.display_name?.trim() ||
    "there";

  const firstName =
    displayName.split(/\s+/)[0];

  /*
   * TODAY'S SCHEDULE
   */

  const todaysGoals =
    goals.filter((goal) =>
      goal.goal_schedules?.some(
        (schedule) =>
          schedule.day_of_week ===
          dayOfWeek
      )
    );

  /*
   * FOCUS PREFERENCE
   */

  const focusMinutes =
    focusPreference?.preset ===
    "deep"
      ? 45
      : focusPreference?.preset ===
          "custom"
        ? focusPreference.custom_focus_minutes
        : 25;

  const breakMinutes =
    focusPreference?.preset ===
    "deep"
      ? 10
      : focusPreference?.preset ===
          "custom"
        ? focusPreference.custom_break_minutes
        : 5;

  const focusLabel =
    focusPreference?.preset ===
    "deep"
      ? "Deep Focus"
      : focusPreference?.preset ===
          "custom"
        ? "Custom Focus"
        : "Pomodoro";

  /*
   * WEEKLY PROGRESS
   */

  const weeklyProgressByGoal =
    new Map<
      string,
      GoalProgress
    >();

  for (const goal of goals) {
    const sessionsForGoal =
      weeklyFocusSessions.filter(
        (session) =>
          session.goal_id ===
          goal.id
      );

    let value = 0;

    if (
      goal.measurement_type ===
      "sessions"
    ) {
      value =
        sessionsForGoal.length;
    }

    if (
      goal.measurement_type ===
      "minutes"
    ) {
      const totalSeconds =
        sessionsForGoal.reduce(
          (
            total,
            session
          ) =>
            total +
            session.actual_duration_seconds,
          0
        );

      value = Math.floor(
        totalSeconds / 60
      );
    }

    if (
      goal.measurement_type ===
      "count"
    ) {
      value =
        weeklyGoalCompletions
          .filter(
            (completion) =>
              completion.goal_id ===
              goal.id
          )
          .reduce(
            (
              total,
              completion
            ) =>
              total +
              completion.quantity,
            0
          );
    }

    const percentage =
      goal.weekly_target > 0
        ? Math.min(
            (value /
              goal.weekly_target) *
              100,
            100
          )
        : 0;

    weeklyProgressByGoal.set(
      goal.id,
      {
        value,
        percentage,
      }
    );
  }

  /*
   * TODAY PROGRESS
   *
   * This is derived from actual
   * activity. We do not store a
   * separate "today completed"
   * boolean.
   */

  const todayProgressByGoal =
    new Map<
      string,
      TodayProgress
    >();

  for (
    const goal of todaysGoals
  ) {
    const schedule =
      goal.goal_schedules.find(
        (item) =>
          item.day_of_week ===
          dayOfWeek
      );

    const scheduledMinutes =
      schedule?.duration_minutes ??
      goal.default_duration_minutes ??
      0;

    const focusSessions =
      todayFocusSessions.filter(
        (session) =>
          session.goal_id ===
          goal.id
      );

    /*
     * Session goal:
     * at least one completed focus
     * session today counts as
     * showing up.
     */
    if (
      goal.measurement_type ===
      "sessions"
    ) {
      const value =
        focusSessions.length;

      todayProgressByGoal.set(
        goal.id,
        {
          value,
          target: 1,
          completed:
            value >= 1,
        }
      );

      continue;
    }

    /*
     * Minutes goal:
     * compare today's completed
     * focus minutes against the
     * scheduled duration.
     */
    if (
      goal.measurement_type ===
      "minutes"
    ) {
      const totalSeconds =
        focusSessions.reduce(
          (
            total,
            session
          ) =>
            total +
            session.actual_duration_seconds,
          0
        );

      const value =
        Math.floor(
          totalSeconds / 60
        );

      const target =
        scheduledMinutes > 0
          ? scheduledMinutes
          : goal.default_duration_minutes ??
            1;

      todayProgressByGoal.set(
        goal.id,
        {
          value,
          target,
          completed:
            value >= target,
        }
      );

      continue;
    }

    /*
     * Count goal:
     * at least one explicitly
     * completed output today.
     */
    const value =
      todayGoalCompletions
        .filter(
          (completion) =>
            completion.goal_id ===
            goal.id
        )
        .reduce(
          (
            total,
            completion
          ) =>
            total +
            completion.quantity,
          0
        );

    todayProgressByGoal.set(
      goal.id,
      {
        value,
        target: 1,
        completed:
          value >= 1,
      }
    );
  }

  const completedTodayCount =
    todaysGoals.filter(
      (goal) =>
        todayProgressByGoal.get(
          goal.id
        )?.completed === true
    ).length;

  const allTodayCompleted =
    todaysGoals.length > 0 &&
    completedTodayCount ===
      todaysGoals.length;

  /*
   * UI
   */

  return (
    <main className="min-h-screen bg-[#f7f9f6] text-gray-900">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">

        {/* HEADER */}

        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-6 flex items-center gap-2 text-lg font-bold text-[#45634c]">
              <span>🌱</span>

              <span>
                Momentum
              </span>
            </div>

            <p className="text-sm font-medium text-[#6c8772]">
              {formattedDate}
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {greeting},{" "}
              {firstName} 👋
            </h1>

            <p className="mt-2 text-gray-500">
              Focus on what matters
              today.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#dce7de] bg-white px-4 py-2 text-sm text-[#52735a]">
            <span>
              {allTodayCompleted
                ? "✓"
                : "🔥"}
            </span>

            <span>
              {allTodayCompleted
                ? "Today's plan complete"
                : `${completedTodayCount} / ${todaysGoals.length} done today`}
            </span>
          </div>
        </header>

        {/* MAIN GRID */}

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">

          {/* TODAY'S PLAN */}

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c8772]">
                  Today
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Today&apos;s Plan
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Your routine for
                  today.
                </p>
              </div>

              <div className="rounded-full bg-[#eef4ef] px-3 py-1.5 text-xs font-medium text-[#45634c]">
                {completedTodayCount}
                {" / "}
                {todaysGoals.length}
              </div>
            </div>

            {allTodayCompleted && (
              <div className="mt-6 rounded-2xl border border-[#dce7de] bg-[#f2f7f3] p-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#45634c] text-sm font-bold text-white">
                    ✓
                  </div>

                  <div>
                    <p className="font-medium text-[#36523d]">
                      Today&apos;s
                      plan is complete.
                    </p>

                    <p className="mt-1 text-sm leading-6 text-[#6c8772]">
                      Nice. Everything
                      you planned for
                      today has been
                      covered.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {todaysGoals.length >
            0 ? (
              <div className="mt-6 space-y-3">
                {todaysGoals.map(
                  (goal) => {
                    const schedule =
                      goal.goal_schedules.find(
                        (item) =>
                          item.day_of_week ===
                          dayOfWeek
                      );

                    const duration =
                      schedule?.duration_minutes ??
                      goal.default_duration_minutes;

                    const todayProgress =
                      todayProgressByGoal.get(
                        goal.id
                      ) ?? {
                        value: 0,
                        target: 1,
                        completed:
                          false,
                      };

                    return (
                      <div
                        key={goal.id}
                        className={`rounded-2xl border p-4 transition ${
                          todayProgress.completed
                            ? "border-[#dce7de] bg-[#f5f9f5]"
                            : "border-gray-100 bg-[#fbfcfb]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 gap-4">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
                                todayProgress.completed
                                  ? "bg-[#dfeae1]"
                                  : "bg-[#eef4ef]"
                              }`}
                            >
                              {todayProgress.completed
                                ? "✓"
                                : goal.icon ||
                                  "🎯"}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p
                                  className={`truncate font-medium ${
                                    todayProgress.completed
                                      ? "text-[#45634c]"
                                      : ""
                                  }`}
                                >
                                  {
                                    goal.name
                                  }
                                </p>

                                {todayProgress.completed && (
                                  <span className="rounded-full bg-[#e3eee5] px-2 py-0.5 text-[11px] font-medium text-[#45634c]">
                                    Done
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-sm text-gray-400">
                                {formatGoalTarget(
                                  goal
                                )}
                              </p>

                              <div className="mt-2">
                                <TodayStatus
                                  goal={
                                    goal
                                  }
                                  progress={
                                    todayProgress
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          {duration && (
                            <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm ring-1 ring-gray-100">
                              {
                                duration
                              }{" "}
                              min
                            </span>
                          )}
                        </div>

                        {!todayProgress.completed && (
                          <div className="mt-4 border-t border-gray-100 pt-4">
                            {goal.measurement_type ===
                            "count" ? (
                              <GoalCompletionButton
                                userId={
                                  user.id
                                }
                                goalId={
                                  goal.id
                                }
                                goalName={
                                  goal.name
                                }
                              />
                            ) : (
                              <Link
                                href="/focus"
                                className="block w-full rounded-xl border border-[#dce7de] bg-white px-4 py-2.5 text-center text-sm font-medium text-[#45634c] transition hover:bg-[#eef4ef]"
                              >
                                Start
                                Focus
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-[#fbfcfb] px-6 py-10 text-center">
                <div className="text-3xl">
                  🌿
                </div>

                <p className="mt-3 font-medium">
                  Nothing scheduled
                  today.
                </p>

                <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-gray-400">
                  Use today to
                  recharge or make
                  progress on
                  something that
                  feels important.
                </p>
              </div>
            )}
          </section>

          {/* FOCUS CARD */}

          <section className="relative overflow-hidden rounded-3xl bg-[#45634c] p-6 text-white shadow-sm sm:p-8">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/5" />

            <div className="absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-white/5" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Focus
                </p>

                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                  {focusLabel}
                </span>
              </div>

              <div className="py-10 text-center">
                <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full border border-white/20 bg-white/5 sm:h-48 sm:w-48">
                  <div>
                    <p className="text-5xl font-semibold tracking-tight">
                      {
                        focusMinutes
                      }
                      :00
                    </p>

                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/50">
                      Focus time
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/focus"
                className="block w-full rounded-2xl bg-white px-5 py-3.5 text-center text-sm font-semibold text-[#45634c] transition hover:bg-[#f2f6f2]"
              >
                Start Focus
              </Link>

              <p className="mt-4 text-center text-xs text-white/50">
                {focusMinutes} min
                focus ·{" "}
                {breakMinutes} min
                break
              </p>
            </div>
          </section>
        </div>

        {/* WEEKLY GOALS */}

        <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c8772]">
                This Week
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Weekly Goals
              </h2>
            </div>

            <p className="hidden text-sm text-gray-400 sm:block">
              Keep showing up.
            </p>
          </div>

          {goals.length > 0 ? (
            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {goals.map(
                (goal) => {
                  const progress =
                    weeklyProgressByGoal.get(
                      goal.id
                    ) ?? {
                      value: 0,
                      percentage:
                        0,
                    };

                  const targetReached =
                    progress.value >=
                    goal.weekly_target;

                  return (
                    <div
                      key={goal.id}
                      className="rounded-2xl border border-gray-100 bg-[#fbfcfb] p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4ef] text-lg">
                            {goal.icon ||
                              "🎯"}
                          </div>

                          <div>
                            <p className="font-medium">
                              {
                                goal.name
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-gray-400">
                              {formatGoalTarget(
                                goal
                              )}
                            </p>
                          </div>
                        </div>

                        {targetReached && (
                          <span className="rounded-full bg-[#e7eee8] px-2.5 py-1 text-xs font-medium text-[#45634c]">
                            ✓ Goal
                          </span>
                        )}
                      </div>

                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-gray-400">
                            Progress
                          </span>

                          <span className="font-medium text-gray-600">
                            {
                              progress.value
                            }{" "}
                            /{" "}
                            {
                              goal.weekly_target
                            }
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-[#6c8772] transition-all duration-500"
                            style={{
                              width: `${progress.percentage}%`,
                            }}
                          />
                        </div>

                        {goal.measurement_type ===
                          "count" && (
                          <div className="mt-4">
                            <GoalCompletionButton
                              userId={
                                user.id
                              }
                              goalId={
                                goal.id
                              }
                              goalName={
                                goal.name
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-[#fbfcfb] p-6 text-center text-sm text-gray-500">
              No active goals yet.
            </div>
          )}
        </section>

        {/* FOOTER */}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            🌱 Momentum rewards
            showing up — not being
            busy.
          </p>
        </div>
      </div>
    </main>
  );
}

/*
 * TODAY STATUS COMPONENT
 */

function TodayStatus({
  goal,
  progress,
}: {
  goal: Goal;
  progress: TodayProgress;
}) {
  if (progress.completed) {
    if (
      goal.measurement_type ===
      "minutes"
    ) {
      return (
        <p className="text-xs font-medium text-[#52735a]">
          {progress.value} /{" "}
          {progress.target} min
          today · Complete
        </p>
      );
    }

    if (
      goal.measurement_type ===
      "count"
    ) {
      return (
        <p className="text-xs font-medium text-[#52735a]">
          {progress.value}{" "}
          {progress.value === 1
            ? "item"
            : "items"}{" "}
          completed today
        </p>
      );
    }

    return (
      <p className="text-xs font-medium text-[#52735a]">
        Completed today
      </p>
    );
  }

  if (
    goal.measurement_type ===
    "minutes"
  ) {
    const percentage =
      progress.target > 0
        ? Math.min(
            (progress.value /
              progress.target) *
              100,
            100
          )
        : 0;

    return (
      <div className="max-w-[220px]">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            Today
          </span>

          <span>
            {progress.value} /{" "}
            {progress.target} min
          </span>
        </div>

        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[#7b957f]"
            style={{
              width: `${percentage}%`,
            }}
          />
        </div>
      </div>
    );
  }

  if (
    goal.measurement_type ===
    "count"
  ) {
    return (
      <p className="text-xs text-gray-400">
        No output completed yet
        today.
      </p>
    );
  }

  return (
    <p className="text-xs text-gray-400">
      No focus session completed
      yet today.
    </p>
  );
}

/*
 * WEEKLY TARGET LABEL
 */

function formatGoalTarget(
  goal: Goal
) {
  if (
    goal.measurement_type ===
    "sessions"
  ) {
    return `${goal.weekly_target} ${
      goal.weekly_target === 1
        ? "session"
        : "sessions"
    } / week`;
  }

  if (
    goal.measurement_type ===
    "minutes"
  ) {
    return `${goal.weekly_target} minutes / week`;
  }

  return `${goal.weekly_target} ${
    goal.weekly_target === 1
      ? "item"
      : "items"
  } / week`;
}