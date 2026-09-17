import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectTasks, { type ProjectTask } from "./project-tasks";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const result = await supabase.from("projects")
    .select("id, name, description, status, due_date, goal_id")
    .eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!result.error && !result.data) notFound();
  const project = result.data;
  const [tasksResult, goalResult] = project ? await Promise.all([
    supabase.from("project_tasks").select("id, name, is_completed, created_at")
      .eq("project_id", project.id).order("created_at", { ascending: true }).order("id", { ascending: true }),
    project.goal_id ? supabase.from("goals").select("name, is_active")
      .eq("id", project.goal_id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]) : [{ data: null, error: null }, { data: null, error: null }];
  const error = result.error || tasksResult.error || goalResult.error;
  if (error) console.error("Unable to load project details:", error);
  const deadline = project?.due_date ? new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", month: "short", day: "numeric", year: "numeric",
  }).format(new Date(`${project.due_date}T00:00:00Z`)) : null;

  return (
    <main className="min-h-screen bg-[#f7f9f6] text-[#171717]">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-12">
        <Link href="/projects" className="text-sm font-medium text-[#45634c] hover:underline">← Back to Projects</Link>
        {error || !project ? (
          <section role="alert" className="mt-6 rounded-3xl border border-gray-200 bg-white p-8">
            <h1 className="text-xl font-semibold">Unable to load this project</h1>
            <p className="mt-2 text-sm text-gray-600">Refresh the page to try again.</p>
          </section>
        ) : (
          <>
            <header className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6c8772]">{project.status} project</p>
              <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight">{project.name}</h1>
              {project.description && <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-gray-600">{project.description}</p>}
              <div className="mt-5 space-y-2 text-sm text-gray-600">
                <p>{goalResult.data ? `Goal: ${goalResult.data.name}${goalResult.data.is_active ? "" : " (paused)"}` : "No related goal"}</p>
                <p>{deadline ? `Due ${deadline}` : "No deadline"}</p>
              </div>
              <Link href={`/projects/${project.id}/edit`} className="mt-5 inline-flex rounded-xl border border-[#dce7de] px-4 py-2 text-sm font-medium text-[#45634c] hover:bg-[#edf3ee]">Edit Project</Link>
            </header>
            <ProjectTasks projectId={project.id} tasks={(tasksResult.data ?? []) as ProjectTask[]} editable={project.status === "active"} />
          </>
        )}
      </div>
    </main>
  );
}
