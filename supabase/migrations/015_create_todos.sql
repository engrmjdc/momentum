create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  list_type text not null check (list_type in ('daily', 'weekly')),
  due_date date not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index todos_user_due_date_idx on public.todos (user_id, due_date);

alter table public.todos enable row level security;

create policy "Users can view their own todos" on public.todos for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own todos" on public.todos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own todos" on public.todos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own todos" on public.todos for delete to authenticated using ((select auth.uid()) = user_id);

create trigger todos_handle_updated_at before update on public.todos for each row execute procedure public.handle_updated_at();

grant select, insert, update, delete on table public.todos to authenticated;
