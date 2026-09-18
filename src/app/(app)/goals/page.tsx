import Link from "next/link";
import GoalStatusButton from "./goal-status-button";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocalWeekRange } from "@/lib/date-utils";

type Goal = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  measurement_type: "sessions" | "minutes" | "count";
  weekly_target: number;
  is_active: boolean;
  default_duration_minutes: number | null;
  goal_schedules: {
    day_of_week: number;
    duration_minutes: number | null;
  }[];
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profileResult = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const timezone = profileResult.data?.timezone || "Asia/Manila";
  const week = getLocalWeekRange(new Date(), timezone);

  const [goalsResult, focusResult, completionsResult] = await Promise.all([
    supabase
      .from("goals")
      .select(`
        id, name, description, icon, measurement_type, is_active,
        weekly_target, default_duration_minutes,
        goal_schedules (day_of_week, duration_minutes)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("focus_sessions")
      .select("goal_id, actual_duration_seconds")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("completed_at", week.start)
      .lt("completed_at", week.end),
    supabase
      .from("goal_completions")
      .select("goal_id, quantity")
      .eq("user_id", user.id)
      .gte("completed_at", week.start)
      .lt("completed_at", week.end),
  ]);

  const queryError = profileResult.error || goalsResult.error ||
    focusResult.error || completionsResult.error;
  if (queryError) console.error("Unable to load Goals page:", queryError);

  const goals = (goalsResult.data ?? []) as Goal[];
  const focusSessions = focusResult.data ?? [];
  const completions = completionsResult.data ?? [];
  const progress = goals.map((goal) => {
    const sessions = focusSessions.filter((session) => session.goal_id === goal.id);
    let value = sessions.length;
    if (goal.measurement_type === "minutes") {
      value = Math.floor(sessions.reduce(
        (total, session) => total + session.actual_duration_seconds, 0
      ) / 60);
    } else if (goal.measurement_type === "count") {
      value = completions.filter((completion) => completion.goal_id === goal.id)
        .reduce((total, completion) => total + completion.quantity, 0);
    }
    return {
      goal,
      value,
      percentage: Math.min((value / goal.weekly_target) * 100, 100),
      reached: value >= goal.weekly_target,
    };
  });
  const activeProgress = progress.filter((item) => item.goal.is_active);
  const pausedProgress = progress.filter((item) => !item.goal.is_active);
  const reachedCount = activeProgress.filter((item) => item.reached).length;
  const groups = [
    { name: "Active Goals", items: activeProgress, empty: "No active goals yet", hint: "Create a goal or resume one below to build your weekly routine." },
    { name: "Paused Goals", items: pausedProgress, empty: "No paused goals", hint: "Paused goals keep their schedules and history. Resume them whenever you are ready." },
  ];
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, month: "short", day: "numeric",
  });
  const weekLabel = `${dateFormatter.format(new Date(week.start))} – ${
    dateFormatter.format(new Date(new Date(week.end).getTime() - 1))
  }`;

  return (
    <main className="min-h-screen bg-[#f5f6ef] text-[#171717]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c8772]">Goals</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Your Goals</h1>
          <p className="mt-2 text-gray-500">Build consistency around what matters to you.</p>
          </div>
          <Link href="/goals/new" className="self-start rounded-xl bg-[#294d3b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#354e3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45634c]">+ Create Goal</Link>
        </header>

        {queryError ? (
          <section role="alert" className="mt-8 rounded-3xl border border-[#dfe6d9] bg-white p-8 shadow-[0_8px_30px_-18px_#294d3b35]">
            <h2 className="text-lg font-semibold">Unable to load your goals</h2>
            <p className="mt-2 text-sm text-gray-600">Refresh the page to try again. Your saved goals and history are unchanged.</p>
            <Link href="/goals" className="mt-4 inline-block rounded-xl border border-[#dce7de] px-4 py-2 text-sm font-medium text-[#45634c]">Try again</Link>
          </section>
        ) : (
          <>
            <section aria-label="Weekly overview" className="mt-8 flex flex-col gap-4 rounded-3xl border border-[#dce7de] bg-[#edf3ee] p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#45634c]">This week · {weekLabel}</p>
                <p className="mt-2 text-lg font-semibold text-[#45634c]">{reachedCount} of {activeProgress.length} weekly targets reached</p>
                <p className="mt-1 text-sm text-gray-600">Your week runs Monday through Sunday in {timezone}.</p>
              </div>
              <span className="self-start rounded-full bg-white px-4 py-2 text-sm font-medium text-[#45634c]">{activeProgress.length} active {activeProgress.length === 1 ? "goal" : "goals"}</span>
            </section>

            {groups.map((group) => (
              <section key={group.name} aria-label={group.name} className="mt-8">
                <h2 className="text-xl font-semibold">{group.name}</h2>
                <p className="mt-2 text-sm text-gray-500">{group.name === "Active Goals" ? "Goals in your current routine. Pausing removes a goal from Today’s Plan." : "Schedules and history are preserved while these goals are paused."}</p>
            {group.items.length === 0 ? (
              <section className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
                <span aria-hidden="true" className="text-3xl">🌱</span>
                <h3 className="mt-4 text-lg font-semibold">{group.empty}</h3>
                <p className="mt-2 text-sm text-gray-500">{group.hint}</p>
              </section>
            ) : (
              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map(({ goal, value, percentage, reached }) => {
                  const unit = goal.measurement_type === "count" ? "items" : goal.measurement_type;
                  return (
                    <article key={goal.id} className="rounded-3xl border border-[#dfe6d9] bg-white p-6 shadow-[0_8px_30px_-18px_#294d3b35]">
                      <div className="flex items-start gap-3">
                        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf3ee] text-xl">{goal.icon || "🎯"}</span>
                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-semibold">{goal.name}</h3>
                          <p className="mt-1 text-sm text-gray-500">{goal.weekly_target} {unit} / week</p>
                        </div>
                      </div>
                      {goal.description && <p className="mt-4 whitespace-pre-line break-words text-sm leading-6 text-gray-600">{goal.description}</p>}
                      <div className="mt-6">
                        <div className="mb-2 flex justify-between gap-2 text-sm">
                          <span className="text-gray-500">Weekly progress</span>
                          <span className="font-medium text-[#45634c]">{value} / {goal.weekly_target}</span>
                        </div>
                        <div role="progressbar" aria-label={`${goal.name} weekly progress`} aria-valuemin={0} aria-valuemax={goal.weekly_target} aria-valuenow={Math.min(value, goal.weekly_target)} aria-valuetext={`${value} of ${goal.weekly_target} ${unit}`} className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-[#6c8772]" style={{ width: `${percentage}%` }} />
                        </div>
                        <p className="mt-2 text-xs font-medium text-[#45634c]">{reached ? "✓ Weekly target reached" : `${Math.round(percentage)}% of weekly target`}</p>
                      </div>
                      <div className="mt-6 border-t border-gray-100 pt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Schedule</p>
                        {goal.goal_schedules.length > 0 ? (
                          <ul className="mt-3 flex flex-wrap gap-2">
                            {[...goal.goal_schedules].sort((a, b) => a.day_of_week - b.day_of_week).map((schedule) => {
                              const minutes = schedule.duration_minutes ?? goal.default_duration_minutes;
                              return <li key={schedule.day_of_week} className="rounded-lg bg-[#edf3ee] px-2.5 py-1.5 text-xs text-[#45634c]">{weekdays[schedule.day_of_week - 1]}{minutes ? ` · ${minutes} min` : ""}</li>;
                            })}
                          </ul>
                        ) : <p className="mt-2 text-sm text-gray-500">No days scheduled.</p>}
                      </div>
                      <div className="mt-5 flex flex-wrap items-start gap-2">
                      <Link href={`/goals/${goal.id}/edit`} className="inline-flex rounded-xl border border-[#dce7de] px-4 py-2 text-sm font-medium text-[#45634c] hover:bg-[#edf3ee]">Edit Goal<span className="sr-only">: {goal.name}</span></Link>
                        <GoalStatusButton key={`${goal.id}-${goal.is_active}`} goalId={goal.id} goalName={goal.name} isActive={goal.is_active} />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
              </section>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
