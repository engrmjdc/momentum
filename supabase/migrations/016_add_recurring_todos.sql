alter table public.todos
  add column if not exists recurrence_group_id uuid,
  add column if not exists recurrence_rule text not null default 'none'
    check (recurrence_rule in ('none', 'daily', 'weekdays', 'weekends', 'selected', 'weekly')),
  add column if not exists recurrence_days smallint[] not null default '{}',
  add column if not exists reminder_time time;

create index if not exists todos_recurrence_group_idx
  on public.todos (user_id, recurrence_group_id, due_date);
