"use client";

import MomentumSelect from "./momentum-select";

const options = Array.from({ length: 48 }, (_, index) => {
  const totalMinutes = index * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const value = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  const label = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 1, hour, minute)));
  return { value, label, icon: "🔔" };
});

export default function ReminderTimeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <MomentumSelect placeholder="No reminder" value={value} options={options} portalOptions onChange={onChange} />;
}
