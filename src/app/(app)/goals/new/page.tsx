"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const inputClass = "mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-[#45634c] focus:outline-none focus:ring-2 focus:ring-[#dce7de]";

export default function CreateGoalPage() {
  const router = useRouter();
  const submitting = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [measurement, setMeasurement] = useState("sessions");
  const unit = measurement === "count" ? "items" : measurement;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const target = Number(data.get("weekly_target"));
    const duration = Number(data.get("duration"));
    const days = data.getAll("days").map(Number);

    setError(null);
    if (!name) {
      setError("Enter a goal name.");
      return;
    }
    if (!Number.isInteger(target) || target < 1 || target > 2147483647) {
      setError("Enter a whole-number weekly target between 1 and 2,147,483,647.");
      return;
    }
    if (!Number.isInteger(duration) || duration < 1 || duration > 180) {
      setError("Enter a duration between 1 and 180 minutes.");
      return;
    }

    submitting.current = true;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: saveError } = await supabase.rpc("create_goal", {
        p_name: name,
        p_description: String(data.get("description") ?? "").trim() || null,
        p_icon: String(data.get("icon") ?? "").trim() || null,
        p_measurement_type: String(data.get("measurement")),
        p_weekly_target: target,
        p_default_duration_minutes: duration,
        p_scheduled_days: days,
      });
      if (saveError) {
        setError(saveError.code === "23505"
          ? "You already have a goal with this name. Choose another name, including for paused goals."
          : "Could not create your goal. Please try again.");
        return;
      }
      router.replace("/goals");
      router.refresh();
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f9f6] text-[#171717]">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
        <Link href="/goals" className="text-sm font-medium text-[#45634c] hover:underline">← Back to Goals</Link>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Create Goal</h1>
        <p className="mt-2 text-gray-500">Choose a weekly target and make room for it in your routine.</p>

        <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <fieldset disabled={saving} className="space-y-6 disabled:opacity-70">
            <legend className="sr-only">Goal details</legend>
            <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
              <div>
                <label htmlFor="name" className="text-sm font-medium">Goal name <span className="text-gray-500">(required)</span></label>
                <input id="name" name="name" required placeholder="e.g. Learn Spanish" className={inputClass} />
              </div>
              <div>
                <label htmlFor="icon" className="text-sm font-medium">Icon</label>
                <input id="icon" name="icon" placeholder="🎯" aria-describedby="icon-help" className={inputClass} />
                <p id="icon-help" className="mt-2 text-xs text-gray-500">Optional emoji.</p>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <textarea id="description" name="description" rows={3} placeholder="What do you want to work toward?" className={inputClass} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="measurement" className="text-sm font-medium">Measure progress in</label>
                <select id="measurement" name="measurement" value={measurement} onChange={(event) => setMeasurement(event.target.value)} aria-describedby="measurement-help" className={inputClass}>
                  <option value="sessions">Focus sessions</option>
                  <option value="minutes">Focus minutes</option>
                  <option value="count">Items completed</option>
                </select>
              </div>
              <div>
                <label htmlFor="weekly_target" className="text-sm font-medium">Weekly target ({unit})</label>
                <input id="weekly_target" name="weekly_target" type="number" min={1} max={2147483647} step={1} required placeholder="e.g. 3" className={inputClass} />
              </div>
            </div>
            <p id="measurement-help" className="text-sm leading-6 text-gray-500">{measurement === "count"
              ? "Track items using Mark complete on Today. Focus sessions do not add to this target."
              : measurement === "minutes"
                ? "Track total minutes from completed focus sessions linked to this goal."
                : "Each completed focus session linked to this goal counts as one session."}</p>

            <div>
              <label htmlFor="duration" className="text-sm font-medium">Default duration (minutes)</label>
              <input id="duration" name="duration" type="number" min={1} max={180} step={1} required defaultValue={25} aria-describedby="duration-help" className={inputClass} />
              <p id="duration-help" className="mt-2 text-xs leading-5 text-gray-500">Plan 1–180 minutes for each scheduled day. Your focus timer preset stays unchanged.</p>
            </div>

            <fieldset>
              <legend className="text-sm font-medium">Scheduled days</legend>
              <p className="mt-2 text-sm text-gray-500">Choose when this goal appears in Today’s Plan. You can leave all days unchecked.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {weekdays.map((day, index) => (
                  <label key={day} className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm has-checked:border-[#6c8772] has-checked:bg-[#edf3ee]">
                    <input type="checkbox" name="days" value={index + 1} className="h-4 w-4 accent-[#45634c]" />
                    {day}
                  </label>
                ))}
              </div>
            </fieldset>
          </fieldset>

          {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-6">
            <button type="submit" disabled={saving} className="rounded-xl bg-[#45634c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#354e3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45634c] disabled:cursor-wait disabled:opacity-60">{saving ? "Creating…" : "Create Goal"}</button>
            {!saving && <Link href="/goals" className="rounded-xl px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</Link>}
          </div>
        </form>
      </div>
    </main>
  );
}
