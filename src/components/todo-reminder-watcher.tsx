"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TodoReminderWatcher({ timezone }: { timezone: string }) {
  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (cancelled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const supabase = createClient();
      const { data: preference } = await supabase.from("focus_preferences").select("browser_notifications_enabled").maybeSingle();
      if (!preference?.browser_notifications_enabled) return;
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
      const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
      const date = `${value("year")}-${value("month")}-${value("day")}`;
      const time = `${value("hour")}:${value("minute")}`;
      const { data: todos } = await supabase.from("todos").select("id, title, reminder_time").eq("due_date", date).eq("is_completed", false).not("reminder_time", "is", null).lte("reminder_time", `${time}:59`);
      for (const todo of todos ?? []) {
        const key = `momentum-reminder-${date}-${todo.id}`;
        if (sessionStorage.getItem(key)) continue;
        new Notification("Momentum reminder", { body: todo.title });
        sessionStorage.setItem(key, "shown");
      }
    }
    void check();
    const interval = window.setInterval(check, 30_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [timezone]);
  return null;
}
