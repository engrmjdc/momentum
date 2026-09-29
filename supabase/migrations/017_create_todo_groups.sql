create table public.todo_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.todo_groups enable row level security;

create policy "Users can view their own todo groups" on public.todo_groups for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own todo groups" on public.todo_groups for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own todo groups" on public.todo_groups for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own todo groups" on public.todo_groups for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.todo_groups to authenticated;

alter table public.todos
  add column group_id uuid references public.todo_groups(id) on delete set null;

create index todos_group_id_idx on public.todos (user_id, group_id);
