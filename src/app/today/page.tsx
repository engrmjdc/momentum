import Link from "next/link";
import { redirect } from "next/navigation";

import GoalCompletionButton from "./goal-completion-button";

import { createClient } from "@/lib/supabase/server";

import {
  formatLocalDate,
  getLocalDateKey,
  getLocalDayOfWeek,
  getLocalDayRange,
  getLocalDayOffsetStart,
  getLocalHour,
  getLocalWeekRange,
} from "@/lib/date-utils";

import {
  buildActivityStrip,
  calculateStreaks,
} from "@/lib/streaks";

import {
  buildActivityCalendar,
  buildActivityCounts,
  getActivityLevel,
} from "@/lib/activity";

/*
 * TYPES
 */

type GoalSchedule = {
  day_of_week: number;
  duration_minutes: number | null;
};

type Goal = {
  id: string;
  name: string;
  icon: string | null;
  measurement_type: "sessions" | "minutes" | "count";
  weekly_target: number;
  default_duration_minutes: number | null;
  goal_schedules: GoalSchedule[];
};

type FocusPreference = {
  preset: "pomodoro" | "deep" | "custom";
  custom_focus_minutes: number;
  custom_break_minutes: number;
};

type FocusSession = {
  goal_id: string | null;
  actual_duration_seconds: number;
  status: "in_progress" | "completed" | "cancelled";
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

/*
 * PAGE
 */

export default async function TodayPage() {
  const supabase = await createClient();

  /*
   * AUTH
   */

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
    .select(`
      display_name,
      timezone
    `)
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error(
      "Unable to load profile:",
      profileError
    );
  }

  const timezone =
    profile?.timezone || "Asia/Manila";

  const now = new Date();

  /*
   * LOCAL DATE INFORMATION
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

  const todayDateKey =
    getLocalDateKey(
      now,
      timezone
    );

  /*
   * We use one year of history for streak calculations.
   */

  const activityHistoryStart =
    getLocalDayOffsetStart(
      now,
      timezone,
      -365
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
    activityFocusResult,
    activityCompletionResult,
  ] = await Promise.all([
    /*
     * ACTIVE GOALS
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
     * FOCUS PREFERENCES
     */

    supabase
      .from("focus_preferences")
      .select(`
        preset,
        custom_focus_minutes,
        custom_break_minutes
      `)
      .eq("user_id", user.id)
      .maybeSingle(),

    /*
     * WEEKLY FOCUS
     */

    supabase
      .from("focus_sessions")
      .select(`
        goal_id,
        actual_duration_seconds,
        status,
        completed_at
      `)
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte(
        "completed_at",
        weekRange.start
      )
      .lt(
        "completed_at",
        weekRange.end
      ),

    /*
     * WEEKLY COUNT COMPLETIONS
     */

    supabase
      .from("goal_completions")
      .select(`
        goal_id,
        quantity,
        completed_at
      `)
      .eq("user_id", user.id)
      .gte(
        "completed_at",
        weekRange.start
      )
      .lt(
        "completed_at",
        weekRange.end
      ),

    /*
     * TODAY FOCUS
     */

    supabase
      .from("focus_sessions")
      .select(`
        goal_id,
        actual_duration_seconds,
        status,
        completed_at
      `)
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte(
        "completed_at",
        dayRange.start
      )
      .lt(
        "completed_at",
        dayRange.end
      ),

    /*
     * TODAY COUNT COMPLETIONS
     */

    supabase
      .from("goal_completions")
      .select(`
        goal_id,
        quantity,
        completed_at
      `)
      .eq("user_id", user.id)
      .gte(
        "completed_at",
        dayRange.start
      )
      .lt(
        "completed_at",
        dayRange.end
      ),

    /*
     * FOCUS ACTIVITY HISTORY
     */

    supabase
      .from("focus_sessions")
      .select(`
        completed_at
      `)
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte(
        "completed_at",
        activityHistoryStart
      )
      .not(
        "completed_at",
        "is",
        null
      ),

    /*
     * COMPLETION ACTIVITY HISTORY
     */

    supabase
      .from("goal_completions")
      .select(`
        completed_at
      `)
      .eq("user_id", user.id)
      .gte(
        "completed_at",
        activityHistoryStart
      ),
  ]);

  /*
   * QUERY ERRORS
   */

  if (goalsResult.error) {
    console.error(
      "Unable to load goals:",
      goalsResult.error
    );
  }

  if (preferenceResult.error) {
    console.error(
      "Unable to load focus preferences:",
      preferenceResult.error
    );
  }

  if (weeklyFocusResult.error) {
    console.error(
      "Unable to load weekly focus sessions:",
      weeklyFocusResult.error
    );
  }

  if (weeklyCompletionResult.error) {
    console.error(
      "Unable to load weekly goal completions:",
      weeklyCompletionResult.error
    );
  }

  if (todayFocusResult.error) {
    console.error(
      "Unable to load today's focus sessions:",
      todayFocusResult.error
    );
  }

  if (todayCompletionResult.error) {
    console.error(
      "Unable to load today's goal completions:",
      todayCompletionResult.error
    );
  }

  if (activityFocusResult.error) {
    console.error(
      "Unable to load focus activity history:",
      activityFocusResult.error
    );
  }

  if (activityCompletionResult.error) {
    console.error(
      "Unable to load completion activity history:",
      activityCompletionResult.error
    );
  }

  /*
   * NORMALIZED DATA
   */

  const goals =
    (goalsResult.data ?? []) as Goal[];

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
   * FOCUS SETTINGS
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

    /*
     * SESSIONS
     */

    if (
      goal.measurement_type ===
      "sessions"
    ) {
      value =
        sessionsForGoal.length;
    }

    /*
     * MINUTES
     */

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

      value =
        Math.floor(
          totalSeconds / 60
        );
    }

    /*
     * COUNT
     */

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
     * SESSION GOALS
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
     * MINUTE GOALS
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
     * COUNT GOALS
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

  /*
   * TODAY SUMMARY
   */

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
   * ACTIVITY HISTORY
   */

  const activeDateKeys = [
    ...(activityFocusResult.data ?? [])
      .filter(
        (session) =>
          session.completed_at !==
          null
      )
      .map((session) =>
        getLocalDateKey(
          new Date(
            session.completed_at!
          ),
          timezone
        )
      ),

    ...(activityCompletionResult.data ??
      []).map((completion) =>
      getLocalDateKey(
        new Date(
          completion.completed_at
        ),
        timezone
      )
    ),
  ];

  /*
   * STREAKS
   */

  const {
    currentStreak,
    longestStreak,
  } = calculateStreaks(
    activeDateKeys,
    todayDateKey
  );

  /*
   * LAST 7 DAYS
   */

  const activityStrip =
    buildActivityStrip(
      activeDateKeys,
      todayDateKey,
      7
    );

  /*
   * ACTIVITY CALENDAR
   */

  const activityCounts =
    buildActivityCounts(
      activeDateKeys
    );

  const activityCalendar =
    buildActivityCalendar(
      activityCounts,
      todayDateKey,
      12
    );

  /*
   * CALENDAR SUMMARY
   *
   * Only include dates visible inside the 12-week
   * calendar.
   */

  const visibleCalendarDateKeys =
    new Set(
      activityCalendar.flatMap(
        (week) =>
          week.days
            .filter(
              (day) =>
                day.inRange
            )
            .map(
              (day) =>
                day.dateKey
            )
      )
    );

  const visibleActivityEntries =
    Array.from(
      activityCounts.entries()
    ).filter(
      ([dateKey]) =>
        visibleCalendarDateKeys.has(
          dateKey
        )
    );

  const totalActiveDays =
    visibleActivityEntries.length;

  const totalActivities =
    visibleActivityEntries.reduce(
      (
        total,
        [, count]
      ) =>
        total + count,
      0
    );

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
              <span>
                🌱
              </span>

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

        {/* TOP GRID */}

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

            {/* COMPLETE MESSAGE */}

            {allTodayCompleted && (
              <div className="mt-6 rounded-2xl border border-[#dce7de] bg-[#f2f7f3] p-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#45634c] text-sm font-bold text-white">
                    ✓
                  </div>

                  <div>
                    <p className="font-medium text-[#36523d]">
                      Today&apos;s plan
                      is complete.
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

            {/* TODAY GOALS */}

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

                            {/* ICON */}

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

                            {/* GOAL INFO */}

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

                          {/* DURATION */}

                          {duration && (
                            <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm ring-1 ring-gray-100">
                              {
                                duration
                              }{" "}
                              min
                            </span>
                          )}
                        </div>

                        {/* ACTION */}

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
                                Start Focus
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

          {/* FOCUS */}

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

        {/* STREAK */}

        <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

            {/* STREAK INFO */}

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c8772]">
                Consistency
              </p>

              <div className="mt-3 flex items-end gap-3">
                <div className="text-3xl">
                  🔥
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-tight text-gray-900">
                      {
                        currentStreak
                      }
                    </span>

                    <span className="text-sm text-gray-500">
                      day streak
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-gray-400">
                    Longest streak:{" "}
                    {
                      longestStreak
                    }{" "}
                    {longestStreak ===
                    1
                      ? "day"
                      : "days"}
                  </p>
                </div>
              </div>
            </div>

            {/* 7 DAY STRIP */}

            <div className="w-full sm:w-auto">
              <p className="mb-3 text-xs font-medium text-gray-400 sm:text-right">
                Last 7 days
              </p>

              <div className="flex justify-between gap-2 sm:justify-end">
                {activityStrip.map(
                  (day) => (
                    <ActivityDayItem
                      key={
                        day.dateKey
                      }
                      dateKey={
                        day.dateKey
                      }
                      active={
                        day.active
                      }
                      todayDateKey={
                        todayDateKey
                      }
                    />
                  )
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-xs leading-5 text-gray-400">
              Any completed focus
              session or completed
              output counts as an
              active day.
            </p>
          </div>
        </section>

        {/* ACTIVITY CALENDAR */}

        <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c8772]">
                Activity
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Your Momentum
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your consistency over
                the last 12 weeks.
              </p>
            </div>

            {/* SUMMARY */}

            <div className="flex gap-8">
              <div>
                <p className="text-xl font-semibold text-gray-800">
                  {
                    totalActiveDays
                  }
                </p>

                <p className="mt-0.5 text-xs text-gray-400">
                  active days
                </p>
              </div>

              <div>
                <p className="text-xl font-semibold text-gray-800">
                  {
                    totalActivities
                  }
                </p>

                <p className="mt-0.5 text-xs text-gray-400">
                  activities
                </p>
              </div>
            </div>
          </div>

          {/* CALENDAR */}

          <div className="mt-8 overflow-x-auto pb-2">
            <div className="w-fit min-w-max">

              <div className="grid grid-cols-[36px_auto] gap-3">

                {/* WEEKDAY LABELS */}

                <div className="pt-[22px]">
                  <div className="grid grid-rows-7 gap-1">
                    {[
                      "Mon",
                      "",
                      "Wed",
                      "",
                      "Fri",
                      "",
                      "Sun",
                    ].map(
                      (
                        label,
                        index
                      ) => (
                        <div
                          key={
                            index
                          }
                          className="flex h-3.5 items-center text-[10px] text-gray-400"
                        >
                          {
                            label
                          }
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* CALENDAR CONTENT */}

                <div>

                  {/* MONTH LABELS */}

                  <ActivityMonthLabels
                    weeks={
                      activityCalendar
                    }
                  />

                  {/* DAYS */}

                  <div className="flex gap-1">
                    {activityCalendar.map(
                      (
                        week,
                        weekIndex
                      ) => (
                        <div
                          key={
                            weekIndex
                          }
                          className="grid shrink-0 grid-rows-7 gap-1"
                        >
                          {week.days.map(
                            (day) => (
                              <ActivityCalendarCell
                                key={
                                  day.dateKey
                                }
                                dateKey={
                                  day.dateKey
                                }
                                count={
                                  day.count
                                }
                                inRange={
                                  day.inRange
                                }
                                todayDateKey={
                                  todayDateKey
                                }
                              />
                            )
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* LEGEND */}

              <div className="mt-5 flex items-center justify-end gap-1.5 text-[10px] text-gray-400">
                <span className="mr-1">
                  Less
                </span>

                {[0, 1, 2, 3, 4].map(
                  (level) => (
                    <div
                      key={
                        level
                      }
                      className={
                        getActivityCellClass(
                          level
                        )
                      }
                    />
                  )
                )}

                <span className="ml-1">
                  More
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-xs leading-5 text-gray-400">
              Focus sessions and
              completed outputs both
              contribute to your
              activity history.
            </p>
          </div>
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
 * 7-DAY ACTIVITY ITEM
 */

function ActivityDayItem({
  dateKey,
  active,
  todayDateKey,
}: {
  dateKey: string;
  active: boolean;
  todayDateKey: string;
}) {
  const date =
    dateKeyToDisplayDate(
      dateKey
    );

  const dayLabel =
    new Intl.DateTimeFormat(
      "en-US",
      {
        weekday: "narrow",
        timeZone: "UTC",
      }
    ).format(date);

  const dayNumber =
    date.getUTCDate();

  const isToday =
    dateKey ===
    todayDateKey;

  return (
    <div className="flex min-w-9 flex-col items-center gap-2">
      <span
        className={`text-[11px] font-medium ${
          isToday
            ? "text-[#45634c]"
            : "text-gray-400"
        }`}
      >
        {dayLabel}
      </span>

      <div
        title={`${dateKey}${
          active
            ? " · Active"
            : " · No activity"
        }`}
        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition ${
          active
            ? "bg-[#45634c] text-white"
            : isToday
              ? "border border-[#b9cbbb] bg-[#f2f7f3] text-[#45634c]"
              : "bg-gray-100 text-gray-400"
        }`}
      >
        {active
          ? "✓"
          : dayNumber}
      </div>
    </div>
  );
}

/*
 * ACTIVITY CALENDAR CELL
 */

function ActivityCalendarCell({
  dateKey,
  count,
  inRange,
  todayDateKey,
}: {
  dateKey: string;
  count: number;
  inRange: boolean;
  todayDateKey: string;
}) {
  const level =
    getActivityLevel(
      count
    );

  const isToday =
    dateKey ===
    todayDateKey;

  const date =
    dateKeyToDisplayDate(
      dateKey
    );

  const label =
    new Intl.DateTimeFormat(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }
    ).format(date);

  /*
   * FUTURE DATE
   */

  if (!inRange) {
    return (
      <div
        title={`${label} · Future`}
        className="h-3.5 w-3.5 shrink-0 rounded-[3px] bg-gray-50"
      />
    );
  }

  /*
   * ACTIVITY DATE
   */

  return (
    <div
      title={`${label} · ${count} ${
        count === 1
          ? "activity"
          : "activities"
      }`}
      className={`${getActivityCellClass(
        level
      )} ${
        isToday
          ? "ring-1 ring-[#45634c] ring-offset-1"
          : ""
      }`}
    />
  );
}

/*
 * MONTH LABELS
 */

function ActivityMonthLabels({
  weeks,
}: {
  weeks: {
    days: {
      dateKey: string;
    }[];
  }[];
}) {
  let previousMonth = "";

  return (
    <div className="mb-2 flex gap-1">
      {weeks.map(
        (
          week,
          index
        ) => {
          const firstDay =
            week.days[0];

          const date =
            dateKeyToDisplayDate(
              firstDay.dateKey
            );

          const month =
            new Intl.DateTimeFormat(
              "en-US",
              {
                month: "short",
                timeZone:
                  "UTC",
              }
            ).format(
              date
            );

          const showMonth =
            month !==
            previousMonth;

          previousMonth =
            month;

          return (
            <div
              key={
                index
              }
              className="w-3.5 shrink-0 text-[9px] text-gray-400"
            >
              {showMonth
                ? month
                : ""}
            </div>
          );
        }
      )}
    </div>
  );
}

/*
 * ACTIVITY INTENSITY
 *
 * Fixed width + height is important here.
 *
 * Do NOT use:
 *
 * aspect-square w-full
 *
 * because that allows the week columns to stretch and
 * creates the oversized calendar we saw previously.
 */

function getActivityCellClass(
  level: number
): string {
  const base =
    "h-3.5 w-3.5 shrink-0 rounded-[3px] transition";

  if (level === 1) {
    return `${base} bg-[#dce8de]`;
  }

  if (level === 2) {
    return `${base} bg-[#abc2af]`;
  }

  if (level === 3) {
    return `${base} bg-[#78977e]`;
  }

  if (level >= 4) {
    return `${base} bg-[#45634c]`;
  }

  return `${base} bg-gray-100`;
}

/*
 * TODAY STATUS
 */

function TodayStatus({
  goal,
  progress,
}: {
  goal: Goal;
  progress: TodayProgress;
}) {
  /*
   * COMPLETED
   */

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

  /*
   * MINUTES
   */

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

  /*
   * COUNT
   */

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

  /*
   * SESSION
   */

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

/*
 * YYYY-MM-DD -> UTC DATE
 */

function dateKeyToDisplayDate(
  dateKey: string
): Date {
  const [
    year,
    month,
    day,
  ] = dateKey
    .split("-")
    .map(Number);

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );
}