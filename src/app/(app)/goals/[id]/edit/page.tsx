import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditGoalForm, { type EditableGoal } from "./edit-goal-form";

export default async function EditGoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const { data: goal, error } = await supabase
    .from("goals")
    .select(`
      id, name, description, icon, measurement_type,
      weekly_target, default_duration_minutes,
      goal_schedules (day_of_week, duration_minutes)
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load goal for editing:", error);
    return (
      <main className="min-h-screen bg-[#f7f9f6] px-5 py-12 text-[#171717]">
        <div role="alert" className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8">
          <h1 className="text-xl font-semibold">Unable to load this goal</h1>
          <p className="mt-2 text-sm text-gray-600">Refresh the page to try again.</p>
          <Link href="/goals" className="mt-4 inline-block text-sm font-medium text-[#45634c]">Back to Goals</Link>
        </div>
      </main>
    );
  }
  if (!goal) notFound();

  return <EditGoalForm key={goal.id} goal={goal as EditableGoal} />;
}
