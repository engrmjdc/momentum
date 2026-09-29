"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import MomentumSelect from "./momentum-select";
import ReminderTimeSelect from "./reminder-time-select";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "./toast-provider";

export type TodoEditorGroup = { id: string; name: string };
export type EditableTodo = {
  id: string;
  title: string;
  due_date: string;
  group_id: string | null;
  reminder_time: string | null;
  recurrence_rule: string;
  todo_groups: TodoEditorGroup[];
};

export default function TodoEditor({
  item,
  groups,
  onClose,
  onSaved,
}: {
  item: EditableTodo | null;
  groups: TodoEditorGroup[];
  onClose: () => void;
  onSaved: (item: EditableTodo) => void;
}) {
  if (!item) return null;
  return <TodoEditorDialog key={item.id} item={item} groups={groups} onClose={onClose} onSaved={onSaved} />;
}

function TodoEditorDialog({ item, groups, onClose, onSaved }: {
  item: EditableTodo;
  groups: TodoEditorGroup[];
  onClose: () => void;
  onSaved: (item: EditableTodo) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [dueDate, setDueDate] = useState(item.due_date);
  const [groupId, setGroupId] = useState(item.group_id ?? "");
  const [reminder, setReminder] = useState(item.reminder_time?.slice(0, 5) ?? "");
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [item, onClose]);

  async function save() {
    if (!title.trim() || !dueDate) return;
    setSaving(true);
    const { error } = await createClient().from("todos").update({
      title: title.trim(),
      due_date: dueDate,
      group_id: groupId || null,
      reminder_time: reminder || null,
    }).eq("id", item.id);
    setSaving(false);
    if (error) {
      showToast("That task could not be saved.", "error");
      return;
    }
    const selectedGroup = groups.find((group) => group.id === groupId);
    onSaved({
      ...item,
      title: title.trim(),
      due_date: dueDate,
      group_id: groupId || null,
      reminder_time: reminder || null,
      todo_groups: selectedGroup ? [selectedGroup] : [],
    });
    showToast("Task details saved.");
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#18251db8] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="todo-editor-title" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-[#dfe6d9] bg-white p-5 shadow-[0_28px_80px_-28px_#17251dcc] sm:max-w-lg sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#6c8772]">Task details</p>
            <h2 id="todo-editor-title" className="mt-1 text-2xl font-semibold text-[#24382b]">Edit To Do</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close task editor" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2f5f2] text-xl text-[#45634c] transition hover:bg-[#e7eee5]">×</button>
        </div>

        {item.recurrence_rule !== "none" && <p className="mt-5 rounded-2xl bg-[#edf3ee] px-4 py-3 text-sm text-[#45634c]">This is a repeating task. These changes apply only to this occurrence.</p>}

        <label className="mt-5 block text-xs font-semibold text-[#526154]">Task name
          <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); }} className="mt-2 w-full rounded-2xl border border-[#d4dfd2] bg-[#fafbf7] px-4 py-3.5 text-base text-[#24382b] outline-none transition focus:border-[#52735a] focus:bg-white" />
        </label>

        <label className="mt-4 block text-xs font-semibold text-[#526154]">Date
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-2 min-h-[54px] w-full rounded-2xl border border-[#d4dfd2] bg-[#fafbf7] px-4 py-3 text-sm text-[#24382b] outline-none focus:border-[#52735a]" />
        </label>

        <div className="mt-4">
          <label className="text-xs font-semibold text-[#526154]">Group</label>
          <MomentumSelect placeholder="No group" value={groupId} options={groups.map((group) => ({ value: group.id, label: group.name, icon: "▦" }))} portalOptions onChange={setGroupId} />
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-[#526154]">Reminder <span className="font-normal text-gray-400">(optional)</span></label>
          <ReminderTimeSelect value={reminder} onChange={setReminder} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-[#d4dfd2] bg-white px-4 py-3 text-sm font-semibold text-[#45634c] transition hover:bg-[#f5f7f1] disabled:opacity-50">Cancel</button>
          <button type="button" onClick={save} disabled={saving || !title.trim() || !dueDate} className="rounded-xl bg-[#294d3b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#45634c] disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
