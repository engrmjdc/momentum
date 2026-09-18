import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateKey, getLocalDayOffsetStart, getLocalWeekRange } from "@/lib/date-utils";
import { buildActivityCalendar, buildActivityCounts } from "@/lib/activity";
import { buildActivityStrip, calculateStreaks } from "@/lib/streaks";
import ActivityCalendar from "./activity-calendar";

type FocusSession = { completed_at: string; actual_duration_seconds: number };
type Completion = { completed_at: string; quantity: number };

// Supabase limits each response; fetch every page in this bounded history window.
async function loadHistory<T>(fetchPage: (from: number, to: number) => PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const result = await fetchPage(from, from + 499);
    if (result.error) throw new Error(result.error.message);
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profileResult = await supabase.from("profiles").select("timezone")
    .eq("id", user.id).single();
  const timezone = profileResult.data?.timezone || "Asia/Manila";
  const now = new Date();
  const today = getLocalDateKey(now, timezone);
  // Match Today's history boundary and streak rules.
  const start = getLocalDayOffsetStart(now, timezone, -365);
  const end = now.toISOString();
  const week = getLocalWeekRange(now, timezone);
  let focus: FocusSession[] = [];
  let completions: Completion[] = [];
  let failed = Boolean(profileResult.error);
  try {
    if (profileResult.error) throw new Error(profileResult.error.message);
    [focus, completions] = await Promise.all([
      loadHistory<FocusSession>((from, to) => supabase.from("focus_sessions")
        .select("completed_at, actual_duration_seconds")
        .eq("user_id", user.id).eq("status", "completed")
        .gte("completed_at", start).lte("completed_at", end)
        .order("completed_at", { ascending: true }).order("id", { ascending: true })
        .range(from, to)),
      loadHistory<Completion>((from, to) => supabase.from("goal_completions")
        .select("completed_at, quantity").eq("user_id", user.id)
        .gte("completed_at", start).lte("completed_at", end)
        .order("completed_at", { ascending: true }).order("id", { ascending: true })
        .range(from, to)),
    ]);
  } catch (error) {
    failed = true;
    console.error("Unable to load progress:", error);
  }

  const dates = [...focus, ...completions].map((entry) => getLocalDateKey(new Date(entry.completed_at), timezone));
  const counts = buildActivityCounts(dates);
  const calendar = buildActivityCalendar(counts, today, 52);
  const streaks = calculateStreaks(dates, today);
  const strip = buildActivityStrip(dates, today);
  const minutes = Math.floor(focus.reduce((sum, session) => sum + session.actual_duration_seconds, 0) / 60);
  const inWeek = (date: string) => date >= week.start && date < week.end;
  const weeklyFocus = focus.filter((entry) => inWeek(entry.completed_at));
  const weeklyCompletions = completions.filter((entry) => inWeek(entry.completed_at));
  const weeklyMinutes = Math.floor(weeklyFocus.reduce((sum, session) => sum + session.actual_duration_seconds, 0) / 60);
  const items = completions.reduce((sum, entry) => sum + entry.quantity, 0);
  const stats = [
    { label: "Focus minutes", value: minutes },
    { label: "Completed focus sessions", value: focus.length },
    { label: "Items recorded", value: items },
    { label: "Active days", value: counts.size },
  ];
  const weekdayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" });
  const dateFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });

  return (
    <main className="min-h-screen bg-[#f7f9f6] text-[#171717]">
      <div className="mx-auto min-w-0 max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c8772]">Progress</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Your Progress</h1>
          <p className="mt-2 text-gray-500">See what your consistency is turning into over time.</p>
        </header>
        {failed ? (
          <section role="alert" className="mt-8 rounded-3xl border border-gray-200 bg-white p-8">
            <h2 className="text-lg font-semibold">Unable to load progress</h2>
            <p className="mt-2 text-sm text-gray-600">Refresh the page to try again. Your saved activity is unchanged.</p>
          </section>
        ) : (
          <>
            <p className="mt-8 text-sm text-gray-500">History since {dateFormatter.format(new Date(`${getLocalDateKey(new Date(start), timezone)}T00:00:00Z`))}, {getLocalDateKey(new Date(start), timezone).slice(0, 4)} · {timezone}</p>
            <section aria-label="History summary" className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-[#dce7de] bg-[#edf3ee] p-5">
                  <p className="text-sm text-[#45634c]">{stat.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-[#45634c]">{stat.value.toLocaleString("en-US")}</p>
                </div>
              ))}
            </section>
            <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7" aria-label="Streaks and recent activity">
              <h2 className="text-xl font-semibold">Keep showing up</h2>
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                <div className="flex flex-wrap gap-8">
                  <div><p className="text-3xl font-semibold text-[#45634c]">{streaks.currentStreak}</p><p className="mt-1 text-sm text-gray-500">Current streak (days)</p></div>
                  <div><p className="text-3xl font-semibold text-[#45634c]">{streaks.longestStreak}</p><p className="mt-1 text-sm text-gray-500">Longest in this history (days)</p></div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Last 7 days</h3>
                  <ul className="mt-3 grid grid-cols-7 gap-1.5">
                    {strip.map((day) => {
                      const date = new Date(`${day.dateKey}T00:00:00Z`);
                      return <li key={day.dateKey} title={`${day.dateKey}: ${counts.get(day.dateKey) ?? 0} activities`} className="min-w-0 text-center">
                        <p className="text-[10px] text-gray-500">{weekdayFormatter.format(date)}</p>
                        <div className={`mt-2 rounded-lg py-2 text-xs font-medium ${day.active ? "bg-[#45634c] text-white" : "bg-gray-100 text-gray-500"} ${day.dateKey === today ? "ring-1 ring-[#45634c] ring-offset-2" : ""}`}><span aria-hidden="true">{day.active ? "✓" : "–"}</span><span className="sr-only">{day.dateKey}: {day.active ? "Active" : "No activity"}</span></div>
                        <p className="mt-2 text-[10px] text-gray-500">{date.getUTCDate()}</p>
                      </li>;
                    })}
                  </ul>
                </div>
              </div>
              <p className="mt-5 text-xs leading-5 text-gray-500">A current streak can continue from yesterday until you record activity today. Streaks use completed focus sessions and goal-completion entries, including activity from paused goals.</p>
            </section>
            <ActivityCalendar weeks={calendar} todayDateKey={today} />
            <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7" aria-label="This week's focus statistics">
              <h2 className="text-xl font-semibold">This Week</h2>
              <p className="mt-2 text-sm text-gray-500">Monday through Sunday in your profile’s timezone.</p>
              <dl className="mt-5 grid gap-5 sm:grid-cols-3">
                <div><dt className="text-sm text-gray-500">Focus minutes</dt><dd className="mt-2 text-2xl font-semibold text-[#45634c]">{weeklyMinutes}</dd></div>
                <div><dt className="text-sm text-gray-500">Completed sessions</dt><dd className="mt-2 text-2xl font-semibold text-[#45634c]">{weeklyFocus.length}</dd></div>
                <div><dt className="text-sm text-gray-500">Items recorded</dt><dd className="mt-2 text-2xl font-semibold text-[#45634c]">{weeklyCompletions.reduce((sum, entry) => sum + entry.quantity, 0)}</dd></div>
              </dl>
            </section>
            {dates.length === 0 && <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">No activity yet. Complete a focus session or record an item on Today to start your history.</p>}
          </>
        )}
      </div>
    </main>
  );
}
