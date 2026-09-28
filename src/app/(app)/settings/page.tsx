import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/app-session";
import { createClient } from "@/lib/supabase/server";
import DeleteAccountForm from "./delete-account-form";
import SettingsForm from "./settings-form";

type FocusPreference = {
  preset: "pomodoro" | "deep" | "custom";
  custom_focus_minutes: number;
  custom_break_minutes: number;
  completion_sound_enabled: boolean;
  browser_notifications_enabled: boolean;
};

export default async function SettingsPage() {
  const { user, profile } = await getAppSession();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("focus_preferences")
    .select("preset, custom_focus_minutes, custom_break_minutes, completion_sound_enabled, browser_notifications_enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  const preference = data as FocusPreference | null;

  return (
    <main className="min-h-screen bg-[#f5f6ef] text-[#171717]">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6c8772]">Settings</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Make Momentum yours</h1>
            <p className="mt-2 text-gray-500">Tune your profile and focus routine in one place.</p>
          </div>
          <Link href="/privacy" className="text-sm font-medium text-[#45634c] underline decoration-[#a9bba5] underline-offset-4 hover:text-[#294d3b]">Privacy &amp; data</Link>
        </div>
        <SettingsForm userId={user.id} email={user.email ?? ""} initialName={profile?.display_name ?? ""}
          initialTimezone={profile?.timezone ?? "Asia/Manila"} initialPreset={preference?.preset ?? "pomodoro"}
          initialFocusMinutes={preference?.custom_focus_minutes ?? 50} initialBreakMinutes={preference?.custom_break_minutes ?? 10}
          initialSoundEnabled={preference?.completion_sound_enabled ?? true}
          initialNotificationsEnabled={preference?.browser_notifications_enabled ?? false} />
        <DeleteAccountForm />
      </div>
    </main>
  );
}
