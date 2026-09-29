import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/app-session";
import { getLocalDateKey, shiftDateKey } from "@/lib/date-utils";
import { createClient } from "@/lib/supabase/server";
import TodoBoard, { type TodoItem } from "./todo-board";

type View = "today" | "week" | "month";

function rangeFor(view: View, today: string) {
  const date = new Date(`${today}T00:00:00Z`);
  if (view === "today") return { start: today, end: today };
  if (view === "week") {
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    const start = shiftDateKey(today, -mondayOffset);
    return { start, end: shiftDateKey(start, 6) };
  }
  const [year, month] = today.split("-").map(Number);
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start: `${today.slice(0, 7)}-01`, end };
}

export default async function TodosPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { user, profile } = await getAppSession();
  if (!user) redirect("/login");
  const requested = (await searchParams).view;
  const view: View = requested === "week" || requested === "month" ? requested : "today";
  const today = getLocalDateKey(new Date(), profile?.timezone || "Asia/Manila");
  const range = rangeFor(view, today);
  const supabase = await createClient();
  const [todosResult, groupsResult] = await Promise.all([
    supabase.from("todos")
      .select("id,title,due_date,list_type,is_completed,completed_at,recurrence_group_id,recurrence_rule,recurrence_days,reminder_time,group_id,todo_groups(id,name)")
      .eq("user_id", user.id).gte("due_date", range.start).lte("due_date", range.end)
      .order("due_date").order("created_at"),
    supabase.from("todo_groups").select("id,name").eq("user_id", user.id).order("name"),
  ]);

  return <main className="min-h-screen text-[#171717]"><div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c8772]">To Do</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">What needs your attention?</h1><p className="mt-2 text-gray-500">Check off your tasks. Add or manage them from Calendar.</p></div><Link href="/calendar" className="self-start rounded-xl bg-[#294d3b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#45634c]">Open calendar</Link></header>
    <nav aria-label="To-do period" className="mt-7 inline-flex rounded-2xl border border-[#dfe6d9] bg-white p-1 shadow-sm">{(["today","week","month"] as View[]).map((item) => <Link key={item} href={item === "today" ? "/todos" : `/todos?view=${item}`} className={`rounded-xl px-5 py-2.5 text-sm font-semibold capitalize transition ${view === item ? "bg-[#edf2e5] text-[#45634c]" : "text-gray-500 hover:bg-[#f5f7f1]"}`}>{item}</Link>)}</nav>
    {todosResult.error || groupsResult.error ? <div role="alert" className="mt-7 rounded-3xl border border-red-200 bg-white p-7 text-sm text-red-700">Could not load your tasks. Make sure migration 017 is applied, then refresh.</div> : <TodoBoard userId={user.id} items={(todosResult.data ?? []) as TodoItem[]} groups={groupsResult.data ?? []} today={today} rangeEnd={range.end} view={view} />}
  </div></main>;
}

