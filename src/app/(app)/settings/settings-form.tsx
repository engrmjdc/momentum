"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import MomentumSelect from "@/components/momentum-select";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast-provider";
import ThemeToggle from "@/components/theme-toggle";

type Preset = "pomodoro" | "deep" | "custom";
type Props = { userId: string; email: string; initialName: string; initialTimezone: string; initialPreset: Preset; initialFocusMinutes: number; initialBreakMinutes: number; initialSoundEnabled: boolean; initialNotificationsEnabled: boolean };

const TIMEZONES = [
  { value: "Asia/Manila", label: "Manila", icon: "🇵🇭", detail: "GMT+8" },
  { value: "Asia/Singapore", label: "Singapore", icon: "🇸🇬", detail: "GMT+8" },
  { value: "Asia/Tokyo", label: "Tokyo", icon: "🇯🇵", detail: "GMT+9" },
  { value: "Asia/Dubai", label: "Dubai", icon: "🇦🇪", detail: "GMT+4" },
  { value: "Europe/London", label: "London", icon: "🇬🇧" },
  { value: "Europe/Paris", label: "Central Europe", icon: "🇪🇺" },
  { value: "America/New_York", label: "New York", icon: "🇺🇸" },
  { value: "America/Chicago", label: "Chicago", icon: "🇺🇸" },
  { value: "America/Denver", label: "Denver", icon: "🇺🇸" },
  { value: "America/Los_Angeles", label: "Los Angeles", icon: "🇺🇸" },
  { value: "Australia/Sydney", label: "Sydney", icon: "🇦🇺" },
];

const PRESETS: Array<{ value: Preset; icon: string; name: string; detail: string }> = [
  { value: "pomodoro", icon: "🍅", name: "Pomodoro", detail: "25 min focus · 5 min break" },
  { value: "deep", icon: "🌿", name: "Deep Focus", detail: "45 min focus · 10 min break" },
  { value: "custom", icon: "✨", name: "Custom", detail: "Choose your own rhythm" },
];

export default function SettingsForm({ userId, email, initialName, initialTimezone, initialPreset, initialFocusMinutes, initialBreakMinutes, initialSoundEnabled, initialNotificationsEnabled }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState(initialName);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [preset, setPreset] = useState<Preset>(initialPreset);
  const [focusMinutes, setFocusMinutes] = useState(initialFocusMinutes);
  const [breakMinutes, setBreakMinutes] = useState(initialBreakMinutes);
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const [notificationsEnabled, setNotificationsEnabled] = useState(initialNotificationsEnabled);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setNotificationPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  function playTestSound() {
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const now = context.currentTime;
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.18;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.58);
    });
    showToast("Playing the completion sound.", "info");
  }

  async function enableNotifications() {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      showToast("This browser does not support notifications.", "error");
      return;
    }
    if (notificationsEnabled && Notification.permission === "granted") { setNotificationsEnabled(false); return; }
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    setNotificationPermission(permission);
    if (permission !== "granted") {
      showToast(permission === "denied" ? "Notifications are blocked in your browser settings." : "Notification permission was not granted.", "error");
      return;
    }
    setNotificationsEnabled(true);
    showToast("Browser notifications enabled.");
  }

  async function sendTestNotification() {
    if (typeof Notification === "undefined") { showToast("This browser does not support notifications.", "error"); return; }
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    setNotificationPermission(permission);
    if (permission !== "granted") { showToast("Allow notifications in your browser to test them.", "error"); return; }
    new Notification("Momentum notifications are ready", { body: "You’ll be notified when a focus session finishes." });
    showToast("Test notification sent.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) { setMessage({ type: "error", text: "Enter the name you want shown in Momentum." }); return; }

    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const [profileResult, preferenceResult] = await Promise.all([
      supabase.from("profiles").update({ display_name: cleanName, timezone }).eq("id", userId),
      supabase.from("focus_preferences").upsert({
        user_id: userId, preset,
        custom_focus_minutes: Math.min(180, Math.max(5, focusMinutes)),
        custom_break_minutes: Math.min(60, Math.max(0, breakMinutes)),
        completion_sound_enabled: soundEnabled,
        browser_notifications_enabled: notificationsEnabled,
      }, { onConflict: "user_id" }),
    ]);
    setSaving(false);

    if (profileResult.error || preferenceResult.error) {
      setMessage({ type: "error", text: "Your settings could not be saved. Please try again." });
      showToast("Your settings could not be saved.", "error");
      return;
    }
    setName(cleanName);
    setMessage({ type: "success", text: "Your settings are saved." });
    showToast("Your settings are saved.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <section className="relative z-10 rounded-3xl border border-[#dfe6d9] bg-white shadow-[0_12px_35px_-24px_#294d3b80]">
        <SectionHeading icon="👤" title="Your profile" description="How you appear and when your day begins." />
        <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <label htmlFor="display-name" className="text-sm font-medium text-[#26382c]">Display name</label>
            <input id="display-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required className="mt-2 w-full rounded-2xl border border-[#d4dfd2] bg-[#fafbf7] px-4 py-3.5 text-sm outline-none transition focus:border-[#6c8772] focus:bg-white focus:ring-4 focus:ring-[#dfe9da]" />
          </div>
          <div>
            <label htmlFor="account-email" className="text-sm font-medium text-[#26382c]">Email address</label>
            <input id="account-email" value={email} readOnly className="mt-2 w-full cursor-not-allowed rounded-2xl border border-[#e2e6df] bg-[#f3f4f0] px-4 py-3.5 text-sm text-gray-500" />
            <p className="mt-2 text-xs text-gray-400">Used to sign in and recover your account.</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="timezone" className="text-sm font-medium text-[#26382c]">Timezone</label>
            <div className="max-w-md"><MomentumSelect id="timezone" options={TIMEZONES} placeholder="Choose a timezone" value={timezone} onChange={setTimezone} /></div>
            <p className="mt-2 text-xs text-gray-400">Your daily plan, streak, and weekly progress follow this timezone.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#dfe6d9] bg-white shadow-[0_12px_35px_-24px_#294d3b80]">
        <SectionHeading icon="◐" title="Appearance" description="Choose the look that feels comfortable for you." />
        <div className="p-6 sm:p-8"><div className="max-w-md rounded-2xl border border-[#dfe6d9] bg-[#f8faf5] p-2"><ThemeToggle /></div><p className="mt-3 text-xs text-gray-500">Your choice is saved on this browser and applies across Momentum.</p></div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#dfe6d9] bg-white shadow-[0_12px_35px_-24px_#294d3b80]">
        <SectionHeading icon="🔔" title="Completion alerts" description="Choose how Momentum lets you know a focus session has ended." />
        <div className="divide-y divide-[#edf0e9] px-6 sm:px-8">
          <PreferenceRow icon={soundEnabled ? "🔊" : "🔇"} title="Completion sound" description="Play a gentle three-note chime when the timer reaches zero."
            enabled={soundEnabled} onToggle={() => setSoundEnabled((current) => !current)} actionLabel="Test sound" onAction={playTestSound} />
          <PreferenceRow icon={notificationsEnabled ? "💬" : "🔕"} title="Browser notification"
            description={notificationPermission === "denied" ? "Blocked by your browser. Update the site permission to enable it." : notificationPermission === "unsupported" ? "Notifications are unavailable in this browser." : "Show an alert when the timer finishes, even while viewing another tab."}
            enabled={notificationsEnabled && notificationPermission === "granted"} onToggle={enableNotifications}
            disabled={notificationPermission === "unsupported"} actionLabel="Send test" onAction={sendTestNotification} />
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#dfe6d9] bg-white shadow-[0_12px_35px_-24px_#294d3b80]">
        <SectionHeading icon="⏱️" title="Focus rhythm" description="Choose the timer you want ready when focus begins." />
        <div className="p-6 sm:p-8">
          <div className="grid gap-3 md:grid-cols-3">
            {PRESETS.map((option) => (
              <button key={option.value} type="button" onClick={() => setPreset(option.value)} aria-pressed={preset === option.value}
                className={`rounded-2xl border p-4 text-left transition ${preset === option.value ? "border-[#45634c] bg-[#edf3e7] shadow-[0_8px_22px_-16px_#294d3b]" : "border-[#e1e6dd] bg-[#fafbf8] hover:border-[#a9bba5] hover:bg-white"}`}>
                <span className="flex items-start justify-between gap-3"><span className="text-xl" aria-hidden="true">{option.icon}</span>{preset === option.value && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#45634c] text-[11px] text-white">✓</span>}</span>
                <span className="mt-3 block text-sm font-semibold text-[#24382b]">{option.name}</span>
                <span className="mt-1 block text-xs leading-5 text-gray-500">{option.detail}</span>
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="mt-5 grid gap-4 rounded-2xl border border-[#dfe6d9] bg-[#f8faf5] p-5 sm:grid-cols-2">
              <NumberField id="focus-minutes" label="Focus minutes" value={focusMinutes} min={5} max={180} onChange={setFocusMinutes} />
              <NumberField id="break-minutes" label="Break minutes" value={breakMinutes} min={0} max={60} onChange={setBreakMinutes} />
            </div>
          )}
        </div>
      </section>

      <div className="relative z-20 flex flex-col gap-3 rounded-2xl border border-[#d9e2d5] bg-white/95 p-3 shadow-[0_15px_40px_-18px_#294d3b80] backdrop-blur sm:sticky sm:bottom-4 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className={`px-2 text-sm ${message?.type === "error" ? "text-red-700" : "text-[#45634c]"}`}>{message?.text ?? "Changes apply to your next focus session."}</div>
        <button type="submit" disabled={saving} className="rounded-xl bg-[#45634c] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#294d3b] disabled:cursor-wait disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button>
      </div>
    </form>
  );
}

function SectionHeading({ icon, title, description }: { icon: string; title: string; description: string }) {
  return <div className="border-b border-[#edf0e9] bg-gradient-to-r from-[#f8faf4] to-white px-6 py-5 sm:px-8"><div className="flex items-center gap-3"><span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf0df] text-xl">{icon}</span><div><h2 className="font-semibold">{title}</h2><p className="mt-0.5 text-sm text-gray-500">{description}</p></div></div></div>;
}

function NumberField({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <div><label htmlFor={id} className="text-sm font-medium text-[#26382c]">{label}</label><input id={id} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-[#d4dfd2] bg-white px-4 py-3 text-sm outline-none focus:border-[#6c8772] focus:ring-4 focus:ring-[#dfe9da]" /></div>;
}

function PreferenceRow({ icon, title, description, enabled, onToggle, disabled = false, actionLabel, onAction }: { icon: string; title: string; description: string; enabled: boolean; onToggle: () => void; disabled?: boolean; actionLabel: string; onAction: () => void }) {
  return <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f4e9]">{icon}</span><div><h3 className="text-sm font-semibold text-[#26382c]">{title}</h3><p className="mt-1 max-w-xl text-xs leading-5 text-gray-500">{description}</p><button type="button" onClick={onAction} className="mt-2 text-xs font-semibold text-[#45634c] underline decoration-[#a9bba5] underline-offset-4">{actionLabel}</button></div></div><button type="button" role="switch" aria-checked={enabled} disabled={disabled} onClick={onToggle} className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45634c] disabled:cursor-not-allowed disabled:opacity-40 ${enabled ? "bg-[#45634c]" : "bg-gray-300"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${enabled ? "left-6" : "left-1"}`} /><span className="sr-only">{enabled ? "Disable" : "Enable"} {title}</span></button></div>;
}
