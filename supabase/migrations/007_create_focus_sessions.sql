create type public.focus_session_status as enum (
    'in_progress',
    'completed',
    'cancelled'
);

create table public.focus_sessions (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    goal_id uuid
        references public.goals(id)
        on delete set null,

    planned_duration_minutes integer not null
        check (
            planned_duration_minutes >= 1
            and planned_duration_minutes <= 180
        ),

    actual_duration_seconds integer not null default 0
        check (actual_duration_seconds >= 0),

    status public.focus_session_status
        not null default 'in_progress',

    started_at timestamptz not null default now(),

    completed_at timestamptz,

    created_at timestamptz not null default now(),

    constraint focus_sessions_completion_check
        check (
            (
                status = 'completed'
                and completed_at is not null
            )
            or
            (
                status <> 'completed'
            )
        )
);

alter table public.focus_sessions
enable row level security;

create policy "Users can view their own focus sessions"
on public.focus_sessions
for select
to authenticated
using (
    (select auth.uid()) = user_id
);

create policy "Users can create their own focus sessions"
on public.focus_sessions
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);

create policy "Users can update their own focus sessions"
on public.focus_sessions
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);

create policy "Users can delete their own focus sessions"
on public.focus_sessions
for delete
to authenticated
using (
    (select auth.uid()) = user_id
);

grant select, insert, update, delete
on table public.focus_sessions
to authenticated;

create index focus_sessions_user_started_at_idx
on public.focus_sessions (
    user_id,
    started_at desc
);

create index focus_sessions_user_goal_started_at_idx
on public.focus_sessions (
    user_id,
    goal_id,
    started_at desc
);