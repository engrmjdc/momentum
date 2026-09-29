"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import MomentumSelect from "@/components/momentum-select";
import ReminderTimeSelect from "@/components/reminder-time-select";
import TodoEditor from "@/components/todo-editor";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast-provider";

export type TodoGroup = { id: string; name: string };
export type TodoItem = {
  id: string; title: string; due_date: string; list_type: "daily" | "weekly";
  is_completed: boolean; completed_at: string | null; recurrence_group_id: string | null;
  recurrence_rule: string; recurrence_days: number[]; reminder_time: string | null;
  group_id: string | null; todo_groups: TodoGroup[];
};

const longDay = (key: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
const shortDate = (key: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));

export default function TodoBoard({ userId, items: initialItems, groups: initialGroups, today, rangeEnd, view }: {
  userId: string; items: TodoItem[]; groups: TodoGroup[]; today: string; rangeEnd: string; view: "today" | "week" | "month";
}) {
  const [items, setItems] = useState(initialItems);
  const [groups, setGroups] = useState(initialGroups);
  const [busy, setBusy] = useState<string | null>(null);
  const [newTask, setNewTask] = useState("");
  const [newDate, setNewDate] = useState(today);
  const [newReminder, setNewReminder] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [removing, setRemoving] = useState<TodoItem | null>(null);
  const [editing, setEditing] = useState<TodoItem | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => { setMounted(true); setItems(initialItems); }, [initialItems]);
  useEffect(() => setGroups(initialGroups), [initialGroups]);

  const dateGroups = useMemo(() => Object.entries(items.reduce<Record<string, TodoItem[]>>((all, item) => {
    (all[item.due_date] ??= []).push(item); return all;
  }, {})), [items]);
  const completed = items.filter((item) => item.is_completed).length;
  const pending = items.length - completed;
  const groupOptions = groups.map((group) => ({ value: group.id, label: group.name, icon: "▦" }));

  async function toggle(item: TodoItem) {
    const next = !item.is_completed; setBusy(item.id);
    setItems((all) => all.map((row) => row.id === item.id ? { ...row, is_completed: next } : row));
    const { error } = await createClient().from("todos").update({ is_completed: next, completed_at: next ? new Date().toISOString() : null }).eq("id", item.id);
    setBusy(null);
    if (error) { setItems((all) => all.map((row) => row.id === item.id ? item : row)); showToast("That task could not be updated.", "error"); }
    else { showToast(next ? "Task completed." : "Task reopened."); router.refresh(); }
  }

  async function remove(item: TodoItem) {
    setBusy(item.id); const { error } = await createClient().from("todos").delete().eq("id", item.id); setBusy(null);
    if (error) { showToast("That task could not be removed.", "error"); return; }
    setItems((all) => all.filter((row) => row.id !== item.id)); setRemoving(null); showToast("Task removed."); router.refresh();
  }

  async function createGroup() {
    const name = groupName.trim(); if (!name) return;
    setAdding(true); const { data, error } = await createClient().from("todo_groups").insert({ user_id: userId, name }).select("id,name").single(); setAdding(false);
    if (error || !data) { showToast(error?.code === "23505" ? "That group already exists." : "That group could not be created.", "error"); return; }
    setGroups((all) => [...all, data].sort((a, b) => a.name.localeCompare(b.name))); setGroupId(data.id); setGroupName(""); setShowGroupForm(false); showToast("Group created.");
  }

  async function addTask() {
    const title = newTask.trim(); if (!title) return; setAdding(true);
    const { data, error } = await createClient().from("todos").insert({ user_id: userId, title, list_type: "daily", due_date: newDate, group_id: groupId || null, reminder_time: newReminder || null, recurrence_rule: "none", recurrence_days: [] }).select("id,title,due_date,list_type,is_completed,completed_at,recurrence_group_id,recurrence_rule,recurrence_days,reminder_time,group_id,todo_groups(id,name)").single();
    setAdding(false);
    if (error || !data) { showToast("That task could not be added.", "error"); return; }
    setNewTask(""); setNewReminder(""); setItems((all) => [...all, data as TodoItem].sort((a, b) => a.due_date.localeCompare(b.due_date))); showToast(newReminder ? "Task and reminder added." : "Task added."); router.refresh();
  }

  async function moveToGroup(itemId: string, nextGroupId: string | null) {
    const item = items.find((row) => row.id === itemId);
    if (!item || item.group_id === nextGroupId) { setDraggedId(null); setDropTarget(null); return; }
    const nextGroup = groups.find((group) => group.id === nextGroupId);
    setItems((all) => all.map((row) => row.id === itemId ? { ...row, group_id: nextGroupId, todo_groups: nextGroup ? [nextGroup] : [] } : row));
    setDraggedId(null); setDropTarget(null);
    const { error } = await createClient().from("todos").update({ group_id: nextGroupId }).eq("id", itemId);
    if (error) {
      setItems((all) => all.map((row) => row.id === itemId ? item : row));
      showToast("That task could not be moved.", "error");
    } else {
      showToast(nextGroup ? `Moved to ${nextGroup.name}.` : "Moved to Other.");
      router.refresh();
    }
  }

  function taskCard(item: TodoItem) {
    return <article key={item.id} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); setDraggedId(item.id); }} onDragEnd={() => { setDraggedId(null); setDropTarget(null); }} className={`group flex cursor-grab items-center gap-3 rounded-2xl border px-4 py-3.5 transition active:cursor-grabbing ${draggedId === item.id ? "scale-[.99] opacity-45" : ""} ${item.is_completed ? "border-[#e3e9df] bg-[#f8faf5]" : "border-[#dfe6d9] bg-white shadow-[0_8px_22px_-18px_#294d3b] hover:border-[#a9bba5]"}`}>
      <span aria-hidden="true" title="Drag to another group" className="select-none text-xs tracking-[-2px] text-gray-300">⠿</span>
      <button disabled={busy === item.id} onClick={() => toggle(item)} aria-label={item.is_completed ? `Mark ${item.title} incomplete` : `Mark ${item.title} complete`} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs transition ${item.is_completed ? "border-[#52735a] bg-[#52735a] text-white" : "border-[#a9bba5] bg-[#fafbf7] hover:bg-[#edf2e5]"}`}>{item.is_completed ? "✓" : ""}</button>
      <button disabled={busy === item.id} onClick={() => setEditing(item)} className={`min-w-0 flex-1 text-left text-sm font-medium ${item.is_completed ? "text-gray-400 line-through" : "text-[#24382b]"}`}><span className="block truncate">{item.title}</span><span className="mt-0.5 block text-[10px] font-normal text-gray-400 opacity-0 transition group-hover:opacity-100">Open details</span></button>
      {item.recurrence_rule !== "none" && <span title="Repeating task" className="rounded-lg bg-[#edf2e5] px-2 py-1 text-xs text-[#52735a]">↻</span>}
      {item.reminder_time && <span title={`Reminder ${item.reminder_time.slice(0, 5)}`} className="text-sm">🔔</span>}
      <select aria-label={`Move ${item.title} to a group`} value={item.group_id ?? ""} onClick={(event) => event.stopPropagation()} onChange={(event) => moveToGroup(item.id, event.target.value || null)} className="max-w-24 rounded-lg border border-[#d4dfd2] bg-[#fafbf7] px-2 py-1.5 text-xs text-[#45634c] md:hidden"><option value="">Other</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
      <button disabled={busy === item.id} onClick={() => setRemoving(item)} aria-label={`Remove ${item.title}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600">×</button>
    </article>;
  }

  return <div className="mt-7 grid gap-5 lg:grid-cols-[300px_1fr]">
    <aside className="rounded-3xl border border-[#dfe6d9] bg-gradient-to-br from-[#eaf1df] to-white p-5 shadow-[0_14px_38px_-28px_#294d3b80] lg:self-start">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf0df] text-xl">✓</span>
      <h2 className="mt-5 text-lg font-semibold">{view === "today" ? "Today’s list" : view === "week" ? "This week" : "This month"}</h2>
      <p className="mt-1 text-sm text-gray-500">Keep the list light and finish what matters.</p>
      <div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-white p-3"><strong className="block text-2xl text-[#45634c]">{pending}</strong><span className="text-xs text-gray-500">Remaining</span></div><div className="rounded-2xl bg-white p-3"><strong className="block text-2xl text-[#45634c]">{completed}</strong><span className="text-xs text-gray-500">Done</span></div></div>
      {items.length > 0 && <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e3eadf]"><div className="h-full rounded-full bg-[#52735a] transition-all" style={{ width: `${completed / items.length * 100}%` }} /></div>}
      <div className="mt-6 border-t border-[#d8e2d5] pt-5"><p className="text-sm font-semibold text-[#294d3b]">Quick add</p>
        <input value={newTask} onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addTask(); }} placeholder="Add a task…" className="mt-3 w-full rounded-xl border border-[#d4dfd2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#52735a]" />
        {view !== "today" && <input type="date" min={today} max={rangeEnd} value={newDate} onChange={(event) => setNewDate(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d4dfd2] bg-white px-3 py-2.5 text-sm" />}
        <div className="mt-1"><MomentumSelect placeholder="No group" value={groupId} options={groupOptions} onChange={setGroupId} /></div>
        <div className="mt-3"><label className="text-xs font-semibold text-[#61715f]">Reminder <span className="font-normal text-gray-400">(optional)</span></label><ReminderTimeSelect value={newReminder} onChange={setNewReminder} /></div>
        {showGroupForm ? <div className="mt-2 flex gap-2"><input autoFocus value={groupName} onChange={(event) => setGroupName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createGroup(); }} placeholder="Group name" className="min-w-0 flex-1 rounded-xl border border-[#d4dfd2] bg-white px-3 py-2 text-sm" /><button onClick={createGroup} disabled={!groupName.trim() || adding} className="rounded-xl bg-[#52735a] px-3 text-sm font-semibold text-white disabled:opacity-50">Save</button></div> : <button onClick={() => setShowGroupForm(true)} className="mt-2 text-xs font-semibold text-[#45634c] hover:underline">+ Create a group</button>}
        <button disabled={adding || !newTask.trim()} onClick={addTask} className="mt-3 w-full rounded-xl bg-[#294d3b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#45634c] disabled:opacity-50">{adding ? "Adding…" : "Add To Do"}</button>
      </div>
      <Link href="/calendar" className="mt-3 flex w-full items-center justify-center rounded-xl border border-[#d4dfd2] bg-white px-4 py-2.5 text-sm font-semibold text-[#45634c]">Repeats & reminders</Link>
    </aside>

    <section className="overflow-hidden rounded-3xl border border-[#dfe6d9] bg-white shadow-[0_14px_38px_-28px_#294d3b80]">
      {!items.length ? <div className="px-6 py-20 text-center"><div className="text-4xl">✨</div><h3 className="mt-4 text-lg font-semibold">You’re all clear</h3><p className="mt-2 text-sm text-gray-500">Add your first task using Quick add.</p></div> : <div className="divide-y divide-[#edf0e9]">{dateGroups.map(([date, dayItems]) => {
        const byGroup = dayItems.reduce<Record<string, TodoItem[]>>((all, item) => { const key = item.group_id || "ungrouped"; (all[key] ??= []).push(item); return all; }, {});
        const allGroups = [...groups.map((group) => ({ key: group.id, name: group.name })), { key: "ungrouped", name: "Other" }];
        const ordered = draggedId ? allGroups : allGroups.filter((group) => byGroup[group.key]?.length);
        return <div key={date} className="p-5 sm:p-6"><div className="mb-4 flex items-baseline gap-2"><h3 className="font-semibold text-[#45634c]">{date === today ? "Today" : longDay(date)}</h3><span className="text-xs text-gray-400">{shortDate(date)}</span>{draggedId && <span className="ml-auto text-xs font-medium text-[#52735a]">Drop into a group</span>}</div><div className="space-y-4">{ordered.map((group) => <div key={group.key} onDragEnter={() => setDropTarget(group.key)} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTarget(group.key); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(null); }} onDrop={(event) => { event.preventDefault(); const itemId = event.dataTransfer.getData("text/plain") || draggedId; if (itemId) moveToGroup(itemId, group.key === "ungrouped" ? null : group.key); }} className={`rounded-2xl p-2 transition ${dropTarget === group.key ? "bg-[#e4eddf] ring-2 ring-[#6c8772] ring-offset-2" : draggedId && !byGroup[group.key]?.length ? "border border-dashed border-[#b9c9b4] bg-[#f8faf5]" : ""}`}><div className="mb-2 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#edf2e5] text-xs text-[#45634c]">▦</span><h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#61715f]">{group.name}</h4><span className="text-xs text-gray-400">{byGroup[group.key]?.length ?? 0}</span></div><div className="space-y-2">{byGroup[group.key]?.map(taskCard)}{draggedId && !byGroup[group.key]?.length && <div className="rounded-xl px-3 py-3 text-center text-xs font-medium text-gray-400">Drop task here</div>}</div></div>)}</div></div>;
      })}</div>}
    </section>
    {mounted && removing && createPortal(<div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#18251da8] p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setRemoving(null); }}><section role="alertdialog" aria-modal="true" aria-labelledby="remove-todo-title" aria-describedby="remove-todo-description" className="w-full max-w-sm rounded-3xl border border-[#dfe6d9] bg-white p-6 shadow-[0_28px_80px_-28px_#17251dcc]"><span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-xl">🗑️</span><h2 id="remove-todo-title" className="mt-5 text-xl font-semibold text-[#24382b]">Remove this To Do?</h2><p id="remove-todo-description" className="mt-2 text-sm leading-6 text-gray-500">“{removing.title}” will be removed from this day. This cannot be undone.</p><div className="mt-6 flex gap-3"><button autoFocus disabled={busy === removing.id} onClick={() => setRemoving(null)} className="flex-1 rounded-xl border border-[#d4dfd2] bg-white px-4 py-3 text-sm font-semibold text-[#45634c] transition hover:bg-[#f5f7f1] disabled:opacity-50">Cancel</button><button disabled={busy === removing.id} onClick={() => remove(removing)} className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">{busy === removing.id ? "Removing…" : "Remove"}</button></div></section></div>, document.body)}
    <TodoEditor item={editing} groups={groups} onClose={() => setEditing(null)} onSaved={(saved) => { setItems((all) => all.map((item) => item.id === saved.id ? { ...item, ...saved } : item).sort((a, b) => a.due_date.localeCompare(b.due_date))); router.refresh(); }} />
  </div>;
}



