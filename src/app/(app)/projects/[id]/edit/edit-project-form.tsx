"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const inputClass = "mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-[#45634c] focus:outline-none focus:ring-2 focus:ring-[#dce7de]";

export type EditableProject = {
  id: string;
  name: string;
  description: string | null;
  goal_id: string | null;
  due_date: string | null;
};

export default function EditProjectForm({ goals, project }: {
  project: EditableProject;
  goals: { id: string; name: string; is_active: boolean }[];
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const goalId = String(form.get("goal_id") ?? "");
    const dueDate = String(form.get("due_date") ?? "");
    setError(null);
    if (!name || name.length > 120 || description.length > 2000) {
      setError("Enter a name of 1–120 characters and a description of up to 2,000 characters.");
      return;
    }
    if (goalId && !goals.some((goal) => goal.id === goalId)) {
      setError("Choose a valid related goal.");
      return;
    }
    busy.current = true;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError("Please sign in again to edit this project.");
        return;
      }
      const { error: saveError } = await supabase.from("projects").update({
        name, description: description || null,
        goal_id: goalId || null, due_date: dueDate || null,
      }).eq("id", project.id).eq("user_id", user.id).select("id").single();
      if (saveError) {
        setError("Could not save your project. Please try again.");
        return;
      }
      router.replace("/projects");
      router.refresh();
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f9f6] text-[#171717]">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
        <Link href="/projects" className="text-sm font-medium text-[#45634c] hover:underline">← Back to Projects</Link>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Edit Project</h1>
        <p className="mt-2 text-gray-500">Update your project details. Its current status stays unchanged.</p>
        <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <fieldset disabled={saving} className="space-y-6 disabled:opacity-70">
            <legend className="sr-only">Project details</legend>
            <div>
              <label htmlFor="name" className="text-sm font-medium">Project name (required)</label>
              <input id="name" name="name" defaultValue={project.name} required maxLength={120} placeholder="e.g. Build my portfolio" className={inputClass} />
            </div>
            <div>
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <textarea id="description" name="description" defaultValue={project.description ?? ""} rows={4} maxLength={2000} placeholder="What will you achieve?" className={inputClass} />
            </div>
            <div>
              <label htmlFor="goal_id" className="text-sm font-medium">Related goal</label>
              <select id="goal_id" name="goal_id" defaultValue={project.goal_id ?? ""} aria-describedby="goal-help" className={inputClass}>
                <option value="">No related goal</option>
                {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}{goal.is_active ? "" : " (paused)"}</option>)}
              </select>
              <p id="goal-help" className="mt-2 text-xs text-gray-500">Optional. Linking a project does not change the goal’s weekly progress.</p>
            </div>
            <div>
              <label htmlFor="due_date" className="text-sm font-medium">Deadline</label>
              <input id="due_date" name="due_date" defaultValue={project.due_date ?? ""} type="date" max="9999-12-31" className={inputClass} />
              <p className="mt-2 text-xs text-gray-500">Optional. Leave blank if there is no deadline.</p>
            </div>
          </fieldset>
          {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <div className="mt-8 flex flex-wrap gap-4 border-t border-gray-100 pt-6">
            <button type="submit" disabled={saving} className="rounded-xl bg-[#45634c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#354e3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45634c] disabled:cursor-wait disabled:opacity-60">{saving ? "Saving…" : "Save Changes"}</button>
            {!saving && <Link href="/projects" className="rounded-xl px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</Link>}
          </div>
        </form>
      </div>
    </main>
  );
}
