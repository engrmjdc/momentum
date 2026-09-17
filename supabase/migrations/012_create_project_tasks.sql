-- Project progress will be calculated from completed tasks / total tasks.
create table public.project_tasks (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null
        references public.projects(id) on delete cascade,
    name text not null
        check (char_length(btrim(name)) between 1 and 200),
    is_completed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.project_tasks enable row level security;

create policy "Users can view tasks for their own projects"
on public.project_tasks for select to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = project_tasks.project_id
          and projects.user_id = (select auth.uid())
    )
);

create policy "Users can create tasks for their own projects"
on public.project_tasks for insert to authenticated
with check (
    exists (
        select 1 from public.projects
        where projects.id = project_tasks.project_id
          and projects.user_id = (select auth.uid())
    )
);

create policy "Users can update tasks for their own projects"
on public.project_tasks for update to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = project_tasks.project_id
          and projects.user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1 from public.projects
        where projects.id = project_tasks.project_id
          and projects.user_id = (select auth.uid())
    )
);

create policy "Users can delete tasks for their own projects"
on public.project_tasks for delete to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = project_tasks.project_id
          and projects.user_id = (select auth.uid())
    )
);

create trigger project_tasks_handle_updated_at
before update on public.project_tasks
for each row execute procedure public.handle_updated_at();

revoke all on table public.project_tasks from anon, authenticated;
grant select, insert, update, delete
on table public.project_tasks to authenticated;

create index project_tasks_project_created_at_idx
on public.project_tasks (project_id, created_at, id);
