-- Projects belong to a user and can optionally relate to one of their goals.
create table public.projects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    goal_id uuid references public.goals(id) on delete set null,
    name text not null check (char_length(btrim(name)) between 1 and 120),
    description text check (description is null or char_length(description) <= 2000),
    status text not null default 'active'
        check (status in ('active', 'completed', 'archived')),
    due_date date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users can view their own projects"
on public.projects for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own projects"
on public.projects for insert to authenticated
with check (
    (select auth.uid()) = user_id
    and (
        goal_id is null
        or exists (
            select 1 from public.goals
            where goals.id = projects.goal_id
              and goals.user_id = (select auth.uid())
        )
    )
);

create policy "Users can update their own projects"
on public.projects for update to authenticated
using ((select auth.uid()) = user_id)
with check (
    (select auth.uid()) = user_id
    and (
        goal_id is null
        or exists (
            select 1 from public.goals
            where goals.id = projects.goal_id
              and goals.user_id = (select auth.uid())
        )
    )
);

create trigger projects_handle_updated_at
before update on public.projects
for each row execute procedure public.handle_updated_at();

-- Archive projects instead of deleting them through the app.
revoke all on table public.projects from anon, authenticated;
grant select, insert, update on table public.projects to authenticated;

create index projects_user_status_created_at_idx
on public.projects (user_id, status, created_at desc);

create index projects_goal_id_idx on public.projects (goal_id);
