"use client";

import { useEffect, useRef, useState } from "react";
import { getActivityLevel, type CalendarWeek } from "@/lib/activity";

const colors = ["bg-gray-100", "bg-[#dce8de]", "bg-[#abc2af]", "bg-[#78977e]", "bg-[#45634c]"];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ActivityCalendar({ weeks, todayDateKey }: {
  weeks: CalendarWeek[];
  todayDateKey: string;
}) {
  const [selected, setSelected] = useState(todayDateKey);
  const scrollContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainer.current;
    if (container) container.scrollLeft = container.scrollWidth - container.clientWidth;
  }, [todayDateKey]);
  const selectedDay = weeks.flatMap((week) => week.days).find((day) => day.dateKey === selected);
  const monthFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" });
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", weekday: "long", month: "short", day: "numeric", year: "numeric",
  });
  const toDate = (key: string) => new Date(`${key}T00:00:00Z`);
  const validDays = weeks.flatMap((week) => week.days).filter((day) => day.inRange);
  const activeDays = validDays.filter((day) => day.count > 0).length;
  const total = validDays.reduce((sum, day) => sum + day.count, 0);
  const rangeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", month: "short", year: "numeric",
  });
  const firstDateKey = weeks[0]?.days[0]?.dateKey ?? todayDateKey;
  const rangeLabel = `${rangeFormatter.format(toDate(firstDateKey))} – ${rangeFormatter.format(toDate(todayDateKey))}`;

  return (
    <section className="mt-6 min-w-0 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7" aria-label="52-week activity calendar">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6c8772]">Activity history</p>
          <h2 className="mt-2 text-xl font-semibold">Your Momentum</h2>
          <p className="mt-2 text-sm text-gray-500">52 weeks ending this week. Select a day to see its activity count.</p>
        </div>
        <p className="text-sm text-[#45634c]">{activeDays} active {activeDays === 1 ? "day" : "days"} · {total} {total === 1 ? "activity" : "activities"}</p>
      </div>
      <p className="mt-5 text-xs font-medium text-[#45634c]">{rangeLabel}</p>
      <div ref={scrollContainer} className="mt-3 overflow-x-auto pb-3" tabIndex={0} aria-label="Activity calendar, scroll horizontally to view all weeks">
        <div className="flex w-max gap-3 px-1 py-1">
          <div className="grid grid-rows-[20px_repeat(7,14px)] gap-1 text-[10px] text-gray-500" aria-hidden="true">
            <span />
            {weekdays.map((day) => <span key={day} className="leading-[14px]">{day === "Mon" || day === "Wed" || day === "Fri" ? day : ""}</span>)}
          </div>
          <div className="flex gap-1">
            {weeks.map((week, index) => {
              const month = week.days[0].dateKey.slice(0, 7);
              const showMonth = index === 0 || month !== weeks[index - 1].days[0].dateKey.slice(0, 7);
              return (
                <div key={week.days[0].dateKey} className="grid shrink-0 grid-rows-[20px_repeat(7,14px)] gap-1">
                  <span className="relative text-[10px] text-gray-500" aria-hidden="true">{showMonth ? monthFormatter.format(toDate(week.days[0].dateKey)) : ""}</span>
                  {week.days.map((day) => (
                    <button key={day.dateKey} type="button" disabled={!day.inRange}
                      onClick={() => setSelected(day.dateKey)}
                      aria-label={`${dayFormatter.format(toDate(day.dateKey))}: ${day.count} ${day.count === 1 ? "activity" : "activities"}${day.dateKey === todayDateKey ? ", today" : ""}`}
                      aria-pressed={selected === day.dateKey}
                      title={`${day.dateKey}: ${day.count} activities`}
                      className={`h-3.5 w-3.5 shrink-0 rounded-[3px] ${day.inRange ? colors[getActivityLevel(day.count)] : "bg-gray-50"} ${day.dateKey === todayDateKey ? "ring-1 ring-[#45634c] ring-offset-1" : ""} ${selected === day.dateKey ? "outline-2 outline-offset-1 outline-[#171717]" : ""} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] disabled:cursor-default`}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <p aria-live="polite" className="text-sm text-gray-600">{dayFormatter.format(toDate(selected))}: {selectedDay?.count ?? 0} {(selectedDay?.count ?? 0) === 1 ? "activity" : "activities"}</p>
        <div className="flex items-center gap-1.5 text-xs text-gray-500" aria-label="Activity intensity: 0, 1, 2, 3, or 4 or more activities">
          <span>Less</span>
          {colors.map((color, index) => <span key={color} title={index === 4 ? "4+ activities" : `${index} activities`} className={`h-3.5 w-3.5 rounded-[3px] ${color}`} />)}
          <span>More</span>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-gray-500">Each completed focus session or saved goal-completion entry counts as one activity. An entry recording several items still counts as one activity. Project tasks do not contribute to streaks.</p>
    </section>
  );
}
