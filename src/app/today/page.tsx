import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GoalCompletionButton from "./goal-completion-button";

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

const WEEKDAY_MAP: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export default async function TodayPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * Load the user's profile first because the timezone
   * determines today's schedule and the weekly range.
   */
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone")
    .eq("id", user.id)
    .single();

  const timezone =
    profile?.timezone || "Asia/Manila";

  const now = new Date();

  /*
   * Determine the user's local weekday.
   */
  const weekday =
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).format(now);

  const dayOfWeek = WEEKDAY_MAP[weekday];

  /*
   * Monday -> next Monday.
   */
  const weekRange = getWeekRange(
    now,
    timezone
  );

  /*
   * Load all dashboard data concurrently.
   */
  const [
    { data: goalsData },
    { data: focusPreferenceData },
    { data: focusSessionsData },
    { data: goalCompletionsData },
  ] = await Promise.all([
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
      .order("created_at", {
        ascending: true,
      }),

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
     * Only completed focus sessions contribute toward
     * session/minute-based weekly progress.
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
     * Explicit output completions power count-based
     * goals.
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
  ]);

  const goals =
    (goalsData ?? []) as Goal[];

  const focusPreference =
    focusPreferenceData as
      | FocusPreference
      | null;

  const focusSessions =
    (focusSessionsData ??
      []) as FocusSession[];

  const goalCompletions =
    (goalCompletionsData ??
      []) as GoalCompletion[];

  /*
   * Header date.
   */
  const formattedDate =
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(now);

  /*
   * Greeting based on user's local time.
   */
  const localHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now)
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
   * Today's scheduled goals.
   */
  const todaysGoals = goals.filter(
    (goal) =>
      goal.goal_schedules?.some(
        (schedule) =>
          schedule.day_of_week ===
          dayOfWeek
      )
  );

  /*
   * Focus preferences.
   */
  const focusMinutes =
    focusPreference?.preset === "deep"
      ? 45
      : focusPreference?.preset ===
          "custom"
        ? focusPreference.custom_focus_minutes
        : 25;

  const breakMinutes =
    focusPreference?.preset === "deep"
      ? 10
      : focusPreference?.preset ===
          "custom"
        ? focusPreference.custom_break_minutes
        : 5;

  const focusLabel =
    focusPreference?.preset === "deep"
      ? "Deep Focus"
      : focusPreference?.preset ===
          "custom"
        ? "Custom Focus"
        : "Pomodoro";

  /*
   * Calculate progress for each goal.
   */
  const progressByGoal = new Map<
    string,
    GoalProgress
  >();

  for (const goal of goals) {
    /*
     * Completed focus sessions associated with this
     * specific goal.
     */
    const sessionsForGoal =
      focusSessions.filter(
        (session) =>
          session.goal_id === goal.id
      );

    let value = 0;

    /*
     * SESSION GOALS
     *
     * Example:
     * Career
     * 3 sessions/week
     */
    if (
      goal.measurement_type ===
      "sessions"
    ) {
      value = sessionsForGoal.length;
    }

    /*
     * MINUTE GOALS
     *
     * Example:
     * Personal Projects
     * 240 minutes/week
     */
    if (
      goal.measurement_type ===
      "minutes"
    ) {
      const totalSeconds =
        sessionsForGoal.reduce(
          (total, session) =>
            total +
            session.actual_duration_seconds,
          0
        );

      value = Math.floor(
        totalSeconds / 60
      );
    }

    /*
     * COUNT GOALS
     *
     * Example:
     * Side Income
     * 5 outputs/week
     *
     * These use explicit goal_completions rather
     * than focus sessions.
     */
    if (
      goal.measurement_type ===
      "count"
    ) {
      value = goalCompletions
        .filter(
          (completion) =>
            completion.goal_id ===
            goal.id
        )
        .reduce(
          (total, completion) =>
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

    progressByGoal.set(goal.id, {
      value,
      percentage,
    });
  }

  return (
    <main className="min-h-screen bg-[#f7f9f6] text-gray-900">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">

        {/* Header */}

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
              {greeting}, {firstName} 👋
            </h1>

            <p className="mt-2 text-gray-500">
              Focus on what matters today.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#dce7de] bg-white px-4 py-2 text-sm text-[#52735a]">
            <span>🔥</span>

            <span>
              Build your momentum
            </span>
          </div>
        </header>

        {/* Main dashboard */}

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">

          {/* Today's Plan */}

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
                  Your routine for today.
                </p>
              </div>

              <div className="rounded-full bg-[#eef4ef] px-3 py-1.5 text-xs font-medium text-[#45634c]">
                {todaysGoals.length}{" "}
                {todaysGoals.length === 1
                  ? "goal"
                  : "goals"}
              </div>
            </div>

            {todaysGoals.length > 0 ? (
              <div className="mt-6 space-y-3">
                {todaysGoals.map(
                  (goal) => {
                    const todaySchedule =
                      goal.goal_schedules.find(
                        (schedule) =>
                          schedule.day_of_week ===
                          dayOfWeek
                      );

                    const duration =
                      todaySchedule?.duration_minutes ??
                      goal.default_duration_minutes;

                    return (
                      <div
                        key={goal.id}
                        className="group flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-[#fbfcfb] p-4 transition hover:border-[#dce7de] hover:bg-[#f7faf7]"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef4ef] text-xl">
                            {goal.icon ||
                              "🎯"}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {goal.name}
                            </p>

                            <p className="mt-1 text-sm text-gray-400">
                              {formatGoalTarget(
                                goal
                              )}
                            </p>
                          </div>
                        </div>

                        {duration && (
                          <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm ring-1 ring-gray-100">
                            {duration} min
                          </span>
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
                  Nothing scheduled today.
                </p>

                <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-gray-400">
                  Use today to recharge or
                  make progress on something
                  that feels important.
                </p>
              </div>
            )}
          </section>

          {/* Focus */}

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
                      {focusMinutes}:00
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
                {focusMinutes} min focus ·{" "}
                {breakMinutes} min break
              </p>
            </div>
          </section>
        </div>

        {/* Weekly Goals */}

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
              {goals.map((goal) => {
                const progress =
                  progressByGoal.get(
                    goal.id
                  ) ?? {
                    value: 0,
                    percentage: 0,
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
                            {goal.name}
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
                          {progress.value} /{" "}
                          {goal.weekly_target}
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
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-[#fbfcfb] p-6 text-center text-sm text-gray-500">
              No active goals yet.
            </div>
          )}
        </section>

        {/* Footer */}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            🌱 Momentum rewards showing up —
            not being busy.
          </p>
        </div>
      </div>
    </main>
  );
}

/*
 * Determine the current Monday -> next Monday range
 * according to the user's local calendar.
 */
function getWeekRange(
  now: Date,
  timeZone: string
): {
  start: string;
  end: string;
} {
  const localParts =
    getLocalDateParts(
      now,
      timeZone
    );

  /*
   * Represent the local calendar date temporarily as UTC.
   * This is only used for calendar arithmetic.
   */
  const localDateAsUtc = new Date(
    Date.UTC(
      localParts.year,
      localParts.month - 1,
      localParts.day
    )
  );

  const jsDay =
    localDateAsUtc.getUTCDay();

  /*
   * JavaScript:
   * Sunday = 0
   * Monday = 1
   * ...
   */
  const mondayOffset =
    jsDay === 0
      ? -6
      : 1 - jsDay;

  const monday =
    new Date(localDateAsUtc);

  monday.setUTCDate(
    localDateAsUtc.getUTCDate() +
      mondayOffset
  );

  const nextMonday =
    new Date(monday);

  nextMonday.setUTCDate(
    monday.getUTCDate() + 7
  );

  return {
    start:
      localMidnightToUtcIso(
        monday,
        timeZone
      ),

    end:
      localMidnightToUtcIso(
        nextMonday,
        timeZone
      ),
  };
}

/*
 * Get the calendar date currently visible to the user
 * in their configured timezone.
 */
function getLocalDateParts(
  date: Date,
  timeZone: string
) {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

  const parts =
    formatter.formatToParts(date);

  const values: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    if (
      part.type !== "literal"
    ) {
      values[part.type] =
        part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

/*
 * Convert midnight on a calendar date in an arbitrary
 * IANA timezone into its UTC timestamptz equivalent.
 */
function localMidnightToUtcIso(
  calendarDate: Date,
  timeZone: string
): string {
  const year =
    calendarDate.getUTCFullYear();

  const month =
    calendarDate.getUTCMonth();

  const day =
    calendarDate.getUTCDate();

  let guess = Date.UTC(
    year,
    month,
    day,
    0,
    0,
    0
  );

  /*
   * Two passes allow the timezone offset to settle,
   * including DST changes.
   */
  for (
    let iteration = 0;
    iteration < 2;
    iteration += 1
  ) {
    const parts =
      getZonedDateTimeParts(
        new Date(guess),
        timeZone
      );

    const representedAsUtc =
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
      );

    const desiredAsUtc =
      Date.UTC(
        year,
        month,
        day,
        0,
        0,
        0
      );

    guess +=
      desiredAsUtc -
      representedAsUtc;
  }

  return new Date(
    guess
  ).toISOString();
}

/*
 * Get full date/time components as seen in a particular
 * timezone.
 */
function getZonedDateTimeParts(
  date: Date,
  timeZone: string
) {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }
    );

  const parts =
    formatter.formatToParts(date);

  const values: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    if (
      part.type !== "literal"
    ) {
      values[part.type] =
        part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

/*
 * Human-readable weekly target.
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