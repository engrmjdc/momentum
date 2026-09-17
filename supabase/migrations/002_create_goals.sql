-- 1. Measurement types

create type public.goal_measurement_type as enum (
    'sessions',
    'minutes',
    'count'
);

-- 2. Goals table

create table public.goals (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    name text not null,

    description text,

    icon text,

    measurement_type public.goal_measurement_type
        not null default 'sessions',

    weekly_target integer not null
        check (weekly_target > 0),

    default_duration_minutes integer
        check (
            default_duration_minutes is null
            or default_duration_minutes > 0
        ),

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Goal schedules table

create table public.goal_schedules (
    id uuid primary key default gen_random_uuid(),

    goal_id uuid not null
        references public.goals(id)
        on delete cascade,

    day_of_week smallint not null
        check (day_of_week between 1 and 7),

    duration_minutes integer
        check (
            duration_minutes is null
            or duration_minutes > 0
        ),

    created_at timestamptz not null default now(),

    unique (goal_id, day_of_week)
);

-- 4. Security for goals

alter table public.goals
enable row level security;

create policy "Users can view their own goals"
on public.goals
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own goals"
on public.goals
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own goals"
on public.goals
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own goals"
on public.goals
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- 5. Security for schedules

alter table public.goal_schedules
enable row level security;

create policy "Users can view schedules for their own goals"
on public.goal_schedules
for select
to authenticated
using (
    exists (
        select 1
        from public.goals
        where goals.id = goal_schedules.goal_id
          and goals.user_id = (select auth.uid())
    )
);

create policy "Users can create schedules for their own goals"
on public.goal_schedules
for insert
to authenticated
with check (
    exists (
        select 1
        from public.goals
        where goals.id = goal_schedules.goal_id
          and goals.user_id = (select auth.uid())
    )
);

create policy "Users can update schedules for their own goals"
on public.goal_schedules
for update
to authenticated
using (
    exists (
        select 1
        from public.goals
        where goals.id = goal_schedules.goal_id
          and goals.user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.goals
        where goals.id = goal_schedules.goal_id
          and goals.user_id = (select auth.uid())
    )
);

create policy "Users can delete schedules for their own goals"
on public.goal_schedules
for delete
to authenticated
using (
    exists (
        select 1
        from public.goals
        where goals.id = goal_schedules.goal_id
          and goals.user_id = (select auth.uid())
    )
);

-- 5. Automatic timestamps

create trigger goals_handle_updated_at
    before update on public.goals
    for each row
    execute procedure public.handle_updated_at();

-- 7. Prevent duplicate goal names

create unique index goals_user_name_unique
on public.goals (user_id, lower(name));