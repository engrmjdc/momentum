import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditProjectForm, { type EditableProject } from "./edit-project-form";

export default async function EditProjectPage({ params }: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const [projectResult, goalsResult] = await Promise.all([
    supabase.from("projects")
      .select("id, name, description, goal_id, due_date")
      .eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("goals").select("id, name, is_active")
      .eq("user_id", user.id).order("created_at", { ascending: true }),
  ]);
  const error = projectResult.error || goalsResult.error;
  if (error) {
    console.error("Unable to load project for editing:", error);
    return (
      <main className="min-h-screen bg-[#f7f9f6] px-5 py-12 text-[#171717]">
        <div role="alert" className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8">
          <h1 className="text-xl font-semibold">Unable to load this project</h1>
          <p className="mt-2 text-sm text-gray-600">Refresh the page to try again.</p>
          <Link href="/projects" className="mt-4 inline-block text-sm font-medium text-[#45634c]">Back to Projects</Link>
        </div>
      </main>
    );
  }
  if (!projectResult.data) notFound();
  return <EditProjectForm key={projectResult.data.id} project={projectResult.data as EditableProject} goals={goalsResult.data ?? []} />;
}
