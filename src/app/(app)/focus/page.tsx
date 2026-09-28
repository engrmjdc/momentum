import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/app-session";
import FocusTimer from "./focus-timer";

type Goal = {
  id: string;
  name: string;
  icon: string | null;
  default_duration_minutes: number | null;
};

type FocusPreference = {
  preset: "pomodoro" | "deep" | "custom";
  custom_focus_minutes: number;
  custom_break_minutes: number;
  completion_sound_enabled: boolean;
  browser_notifications_enabled: boolean;
};

export default async function FocusPage() {
  const supabase = await createClient();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: goalsData }, { data: preferenceData }] =
    await Promise.all([
      supabase
        .from("goals")
        .select(
          `
            id,
            name,
            icon,
            default_duration_minutes
          `
        )
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),

      supabase
        .from("focus_preferences")
        .select(
          `
            preset,
            custom_focus_minutes,
            custom_break_minutes,
            completion_sound_enabled,
            browser_notifications_enabled
          `
        )
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const goals = (goalsData ?? []) as Goal[];

  const preference =
    preferenceData as FocusPreference | null;

  const defaultFocusMinutes =
    preference?.preset === "deep"
      ? 45
      : preference?.preset === "custom"
        ? preference.custom_focus_minutes
        : 25;

  const breakMinutes =
    preference?.preset === "deep"
      ? 10
      : preference?.preset === "custom"
        ? preference.custom_break_minutes
        : 5;

  const presetLabel =
    preference?.preset === "deep"
      ? "Deep Focus"
      : preference?.preset === "custom"
        ? "Custom"
        : "Pomodoro";

  return (
    <FocusTimer
      userId={user.id}
      goals={goals}
      defaultFocusMinutes={defaultFocusMinutes}
      breakMinutes={breakMinutes}
      presetLabel={presetLabel}
      completionSoundEnabled={preference?.completion_sound_enabled ?? true}
      browserNotificationsEnabled={preference?.browser_notifications_enabled ?? false}
    />
  );
}
