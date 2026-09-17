"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type ProjectTask = {
  id: string;
  name: string;
  is_completed: boolean;
  created_at: string;
};

export default function ProjectTasks({ projectId, tasks, editable }: {
  projectId: string;
  tasks: ProjectTask[];
  editable: boolean;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const disabled = saving || refreshing;
  const completed = tasks.filter((task) => task.is_completed).length;
  const percentage = tasks.length ? Math.round(completed / tasks.length * 100) : 0;

  async function mutate(operation: "add" | "rename" | "toggle" | "delete", task?: ProjectTask, name?: string): Promise<boolean> {
    if (busy.current || refreshing || !editable) return false;
    if ((operation === "add" || operation === "rename") && (!name?.trim() || name.trim().length > 200)) {
      setError("Enter a task name of 1–200 characters.");
      return false;
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError("Please sign in again to change tasks.");
        return false;
      }
      // Recheck project ownership and state before changing tasks.
      const { data: project, error: projectError } = await supabase.from("projects")
        .select("status").eq("id", projectId).eq("user_id", user.id).single();
      if (projectError || project.status !== "active") {
        setError("This project is unavailable or no longer active. Refresh the page.");
        return false;
      }

      let result;
      if (operation === "add") {
        result = await supabase.from("project_tasks")
          .insert({ project_id: projectId, name: name!.trim() }).select("id").single();
      } else if (task && operation === "delete") {
        result = await supabase.from("project_tasks").delete()
          .eq("id", task.id).eq("project_id", projectId).select("id").single();
      } else if (task) {
        result = await supabase.from("project_tasks")
          .update(operation === "toggle" ? { is_completed: !task.is_completed } : { name: name!.trim() })
          .eq("id", task.id).eq("project_id", projectId).select("id").single();
      } else return false;

      if (result.error) {
        setError("Could not save this task change. Refresh and try again.");
        return false;
      }
      setEditingId(null);
      setDeletingId(null);
      startTransition(() => router.refresh());
      return true;
    } catch {
      setError("Could not connect. Please try again.");
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (await mutate("add", undefined, String(new FormData(form).get("name") ?? ""))) form.reset();
  }

  return (
    <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8" aria-label="Project tasks">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <p className="text-sm font-medium text-[#45634c]">{completed} / {tasks.length} completed · {percentage}%</p>
      </div>
      <div role="progressbar" aria-label="Project task progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} aria-valuetext={`${completed} of ${tasks.length} tasks completed`} className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-[#6c8772]" style={{ width: `${percentage}%` }} />
      </div>
      {!editable && <p className="mt-4 text-sm text-gray-500">Reopen or restore this project on Projects to change its tasks.</p>}
      {editable && (
        <form onSubmit={addTask} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="new-task" className="sr-only">New task name</label>
          <input id="new-task" name="name" required maxLength={200} disabled={disabled} placeholder="Add a task, e.g. Choose portfolio examples" className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-2 focus:outline-[#45634c]" />
          <button type="submit" disabled={disabled} className="rounded-xl bg-[#45634c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#354e3b] disabled:opacity-60">{disabled ? "Saving…" : "Add Task"}</button>
        </form>
      )}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {tasks.length === 0 ? (
        <p className="mt-6 rounded-xl bg-[#f7f9f6] p-5 text-sm text-gray-500">No tasks yet. Add tasks to break this project into smaller steps.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-2xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <label className="flex min-w-0 flex-1 items-start gap-3 text-sm">
                  <input type="checkbox" checked={task.is_completed} disabled={!editable || disabled} onChange={() => mutate("toggle", task)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#45634c]" />
                  <span className={`break-words ${task.is_completed ? "text-gray-500 line-through" : "text-gray-800"}`}>{task.name}</span>
                </label>
                {editable && (
                  <div className="flex gap-3 text-xs font-medium">
                    <button type="button" disabled={disabled} onClick={() => { setEditingId(task.id); setDeletingId(null); }} aria-label={`Rename ${task.name}`} className="text-[#45634c] hover:underline disabled:opacity-60">Rename</button>
                    <button type="button" disabled={disabled} onClick={() => { setDeletingId(task.id); setEditingId(null); }} aria-label={`Remove ${task.name}`} className="text-gray-600 hover:underline disabled:opacity-60">Remove</button>
                  </div>
                )}
              </div>
              {editable && editingId === task.id && (
                <form onSubmit={(event) => {
                  event.preventDefault();
                  void mutate("rename", task, String(new FormData(event.currentTarget).get("name") ?? ""));
                }} className="mt-4 flex flex-wrap gap-2">
                  <label htmlFor={`task-${task.id}`} className="sr-only">Task name</label>
                  <input id={`task-${task.id}`} name="name" defaultValue={task.name} required maxLength={200} disabled={disabled} className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <button type="submit" disabled={disabled} className="rounded-lg bg-[#45634c] px-3 py-2 text-xs font-medium text-white">Save</button>
                  <button type="button" disabled={disabled} onClick={() => setEditingId(null)} className="px-3 py-2 text-xs text-gray-600">Cancel</button>
                </form>
              )}
              {editable && deletingId === task.id && (
                <div className="mt-4 rounded-xl bg-red-50 p-3">
                  <p className="text-sm text-red-800">Remove this task permanently? This also removes it from project progress.</p>
                  <div className="mt-3 flex gap-3">
                    <button type="button" disabled={disabled} onClick={() => mutate("delete", task)} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-medium text-white">Remove Task</button>
                    <button type="button" disabled={disabled} onClick={() => setDeletingId(null)} className="px-3 py-2 text-xs text-gray-600">Cancel</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-5 text-xs leading-5 text-gray-500">Task completion updates project progress. Project status and related goal progress are managed separately.</p>
    </section>
  );
}
