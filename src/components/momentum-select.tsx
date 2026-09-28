"use client";

import { useId, useRef, useState } from "react";

export type MomentumSelectOption = {
  value: string;
  label: string;
  icon?: string | null;
  detail?: string;
};

type Props = {
  id?: string;
  name?: string;
  options: MomentumSelectOption[];
  placeholder: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  describedBy?: string;
  onChange?: (value: string) => void;
};

export default function MomentumSelect({ id, name, options, placeholder, value,
  defaultValue = "", disabled = false, describedBy, onChange }: Props) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const listId = `${selectId}-options`;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const selectedValue = value ?? internalValue;
  const selected = options.find((option) => option.value === selectedValue);
  const allOptions = [{ value: "", label: placeholder, icon: null }, ...options];

  function choose(nextValue: string) {
    if (value === undefined) setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
    trigger.current?.focus();
  }

  function move(amount: number) {
    setOpen(true);
    setHighlighted((current) => (current + amount + allOptions.length) % allOptions.length);
  }

  return (
    <div className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      <button ref={trigger} id={selectId} type="button" disabled={disabled}
        role="combobox" aria-haspopup="listbox" aria-expanded={open}
        aria-controls={listId} aria-describedby={describedBy}
        onClick={() => {
          setHighlighted(Math.max(0, allOptions.findIndex((option) => option.value === selectedValue)));
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
          if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
          if (event.key === "Enter" && open) { event.preventDefault(); choose(allOptions[highlighted].value); }
          if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
          if (event.key === "Home" && open) { event.preventDefault(); setHighlighted(0); }
          if (event.key === "End" && open) { event.preventDefault(); setHighlighted(allOptions.length - 1); }
        }}
        className="mt-2 flex w-full items-center justify-between gap-4 rounded-2xl border border-[#d4dfd2] bg-[#fafbf7] px-4 py-3.5 text-left text-sm text-[#233b2c] shadow-[0_3px_12px_-8px_#294d3b60] transition hover:border-[#94a98d] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45634c] disabled:cursor-wait disabled:opacity-60">
        <span className={`flex min-w-0 items-center gap-3 ${selected ? "" : "text-gray-500"}`}>
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eaf0df] text-lg">{selected?.icon || (selected ? "🎯" : "—")}</span>
          <span className="truncate font-medium">{selected?.label ?? placeholder}</span>
          {selected?.detail && <span className="shrink-0 rounded-full bg-[#edf2e5] px-2 py-1 text-[10px] text-[#61715f]">{selected.detail}</span>}
        </span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 fill-none stroke-current transition ${open ? "rotate-180" : ""}`}><path d="m5 7.5 5 5 5-5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {open && !disabled && (
        <div id={listId} role="listbox" aria-activedescendant={`${selectId}-option-${highlighted}`}
          className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-[#dfe6d9] bg-white p-2 shadow-[0_18px_45px_-18px_#294d3b70]">
          {allOptions.map((option, index) => (
            <button key={option.value || "empty"} id={`${selectId}-option-${index}`} type="button"
              role="option" aria-selected={option.value === selectedValue}
              onMouseEnter={() => setHighlighted(index)} onClick={() => choose(option.value)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${index === highlighted ? "bg-[#edf2e5]" : "hover:bg-[#f5f7f1]"} ${option.value === selectedValue ? "font-semibold text-[#294d3b]" : "text-[#455448]"}`}>
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f4e9] text-lg">{option.icon || (option.value ? "🎯" : "—")}</span>
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.detail && <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-[#74816f]">{option.detail}</span>}
              {option.value === selectedValue && <span aria-hidden="true" className="text-[#45634c]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
