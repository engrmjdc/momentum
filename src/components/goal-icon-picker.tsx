"use client";

import { useRef, useState } from "react";

const icons = [
  ["🎯", "Target"], ["🌱", "Growth"], ["💼", "Career"], ["💻", "Coding"],
  ["📚", "Learning"], ["✍️", "Writing"], ["🎨", "Art"], ["🎵", "Music"],
  ["💪", "Strength"], ["🏃", "Running"], ["🧘", "Mindfulness"], ["🚴", "Cycling"],
  ["🥗", "Nutrition"], ["💧", "Water"], ["😴", "Sleep"], ["❤️", "Wellbeing"],
  ["💰", "Income"], ["🏦", "Saving"], ["🚀", "Launch"], ["💡", "Ideas"],
  ["🏡", "Home"], ["🧹", "Tidying"], ["🌍", "Travel"], ["🗣️", "Languages"],
  ["📷", "Photography"], ["🛠️", "Building"], ["🤝", "Connection"], ["⭐", "Personal goal"],
] as const;

export default function GoalIconPicker({ defaultValue = "", disabled = false }: {
  defaultValue?: string;
  disabled?: boolean;
}) {
  const [icon, setIcon] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  function choose(value: string) {
    setIcon(value);
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div className="relative" onKeyDown={(event) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <label htmlFor="icon" className="text-sm font-medium">Icon</label>
      <input type="hidden" name="icon" value={icon} />
      <button ref={trigger} id="icon" type="button" disabled={disabled}
        aria-expanded={open} aria-controls="goal-icon-options" aria-describedby="icon-help"
        aria-label={`Choose goal icon${icon ? `, currently ${icon}` : ""}`}
        onClick={() => setOpen((current) => !current)}
        className="mt-2 flex w-full items-center justify-between rounded-xl border border-[#dbe3d7] bg-[#fafbf7] px-4 py-2.5 text-[#294d3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45634c] disabled:cursor-wait">
        <span aria-hidden="true" className="text-2xl">{icon || "🎯"}</span>
        <span aria-hidden="true" className="text-xs">{open ? "▴" : "▾"}</span>
      </button>
      <p id="icon-help" className="mt-2 text-xs text-gray-500">Choose an emoji.</p>
      {open && !disabled && (
        <div id="goal-icon-options" role="group" aria-label="Goal icons"
          className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-[#dfe6d9] bg-white p-3 shadow-xl">
          <p className="px-1 pb-2 text-xs font-semibold text-[#45634c]">Pick your goal’s icon</p>
          <div className="grid grid-cols-4 gap-1">
            {icons.map(([emoji, label]) => (
              <button key={emoji} type="button" aria-label={label} title={label}
                aria-pressed={icon === emoji} onClick={() => choose(emoji)}
                className={`flex h-11 items-center justify-center rounded-xl text-2xl transition hover:bg-[#edf2e5] focus-visible:outline-2 focus-visible:outline-[#45634c] ${icon === emoji ? "bg-[#eaf0df] ring-1 ring-[#789268]" : "bg-[#fafbf7]"}`}>
                <span aria-hidden="true">{emoji}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => choose("")} className="mt-3 w-full rounded-lg px-3 py-2 text-xs font-medium text-[#45634c] hover:bg-[#edf2e5] focus-visible:outline-2 focus-visible:outline-[#45634c]">Use default icon</button>
        </div>
      )}
    </div>
  );
}
