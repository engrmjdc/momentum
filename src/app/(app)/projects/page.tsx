import Link from "next/link";
import ProjectStatusActions from "./project-status-actions";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateKey } from "@/lib/date-utils";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "completed" | "archived";
  due_date: string | null;
  goal_id: string | null;
  project_tasks: { id: string; is_completed: boolean }[];
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [projectsResult, goalsResult, profileResult] = await Promise.all([
    supabase.from("projects")
      .select("id, name, description, status, due_date, goal_id, project_tasks (id, is_completed)")
      .eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("goals").select("id, name, is_active").eq("user_id", user.id),
    supabase.from("profiles").select("timezone").eq("id", user.id).single(),
  ]);
  const error = projectsResult.error || goalsResult.error || profileResult.error;
  if (error) console.error("Unable to load projects:", error);
  const projects = (projectsResult.data ?? []) as Project[];
  const goals = new Map((goalsResult.data ?? []).map((goal) => [goal.id, goal]));
  const today = getLocalDateKey(new Date(), profileResult.data?.timezone || "Asia/Manila");
  const groups = [
    { status: "active", name: "Active Projects", empty: "No active projects yet", hint: "Create a project to start turning an idea into something you can finish." },
    { status: "completed", name: "Completed Projects", empty: "No completed projects yet", hint: "Finished projects will appear here." },
    { status: "archived", name: "Archived Projects", empty: "No archived projects", hint: "Projects set aside will appear here." },
  ];
  const deadlineFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", month: "short", day: "numeric", year: "numeric",
  });

  return (
    <main className="min-h-screen bg-[#f5f6ef] text-[#171717]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c8772]">Projects</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Your Projects</h1>
            <p className="mt-2 text-gray-500">Turn larger ideas into something you can steadily finish.</p>
          </div>
          <Link href="/projects/new" className="self-start rounded-xl bg-[#294d3b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#354e3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45634c]">+ Create Project</Link>
        </header>

        {error ? (
          <section role="alert" className="mt-8 rounded-3xl border border-[#dfe6d9] bg-white p-8">
            <h2 className="text-lg font-semibold">Unable to load projects</h2>
            <p className="mt-2 text-sm text-gray-600">Refresh the page to try again.</p>
          </section>
        ) : (
          <>
            <section aria-label="Project overview" className="mt-8 grid gap-3 sm:grid-cols-3">
              {groups.map((group) => (
                <div key={group.status} className="rounded-2xl border border-[#dce7de] bg-[#edf3ee] p-5">
                  <p className="text-sm text-[#45634c]">{group.name}</p>
                  <p className="mt-2 text-3xl font-semibold text-[#45634c]">{projects.filter((project) => project.status === group.status).length}</p>
                </div>
              ))}
            </section>
            {groups.map((group) => {
              const items = projects.filter((project) => project.status === group.status);
              return (
                <section key={group.status} aria-label={group.name} className="mt-8">
                  <h2 className="text-xl font-semibold">{group.name}</h2>
                  {items.length === 0 ? (
                    <div className="mt-4 rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center">
                      <h3 className="font-medium">{group.empty}</h3>
                      <p className="mt-2 text-sm text-gray-500">{group.hint}</p>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {items.map((project) => {
                        const goal = project.goal_id ? goals.get(project.goal_id) : null;
                        const overdue = project.status === "active" && project.due_date && project.due_date < today;
                        const tasks = project.project_tasks ?? [];
                        const completed = tasks.filter((task) => task.is_completed).length;
                        const percentage = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
                        return (
                          <article key={project.id} className="rounded-3xl border border-[#dfe6d9] bg-white p-6 shadow-[0_8px_30px_-18px_#294d3b35]">
                            <h3 className="break-words text-lg font-semibold">{project.name}</h3>
                            {project.description && <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-gray-600">{project.description}</p>}
                            <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
                              <p className="break-words text-[#45634c]">{goal ? `Goal: ${goal.name}${goal.is_active ? "" : " (paused)"}` : "No related goal"}</p>
                              <p className={overdue ? "text-amber-700" : "text-gray-500"}>
                                {project.due_date ? `Due ${deadlineFormatter.format(new Date(`${project.due_date}T00:00:00Z`))}${overdue ? " · Overdue" : ""}` : "No deadline"}
                              </p>
                            </div>
                            <div className="mt-5">
                              <p className="text-sm text-gray-600">{completed} / {tasks.length} tasks completed · {percentage}%</p>
                              <div role="progressbar" aria-label={`${project.name} task progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                                <div className="h-full rounded-full bg-[#6c8772]" style={{ width: `${percentage}%` }} />
                              </div>
                              <Link href={`/projects/${project.id}`} className="mt-4 inline-flex rounded-xl bg-[#294d3b] px-4 py-2 text-sm font-medium text-white hover:bg-[#354e3b]">View Tasks<span className="sr-only">: {project.name}</span></Link>
                            </div>
                            <Link href={`/projects/${project.id}/edit`} className="mt-5 inline-flex rounded-xl border border-[#dce7de] px-4 py-2 text-sm font-medium text-[#45634c] hover:bg-[#edf3ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45634c]">Edit Project<span className="sr-only">: {project.name}</span></Link>
                            <ProjectStatusActions key={`${project.id}-${project.status}`} projectId={project.id} projectName={project.name} status={project.status} />
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </>
        )}
      </div>
    </main>
  );
}
