-- Focus preferences migration

create type public.focus_preset_type as enum (
    'pomodoro',
    'deep',
    'custom'
);

create table public.focus_preferences (
    user_id uuid primary key references auth.users(id) on delete cascade,

    preset public.focus_preset_type not null default 'pomodoro',

    custom_focus_minutes integer not null default 50
        check (
            custom_focus_minutes >= 5
            and custom_focus_minutes <= 180
        ),

    custom_break_minutes integer not null default 10
        check (
            custom_break_minutes >= 0
            and custom_break_minutes <= 60
        ),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.focus_preferences
enable row level security;

create policy "Users can view their own focus preferences"
on public.focus_preferences
for select
to authenticated
using (
    (select auth.uid()) = user_id
);

create policy "Users can create their own focus preferences"
on public.focus_preferences
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);

create policy "Users can update their own focus preferences"
on public.focus_preferences
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);

create policy "Users can delete their own focus preferences"
on public.focus_preferences
for delete
to authenticated
using (
    (select auth.uid()) = user_id
);

create trigger focus_preferences_handle_updated_at
    before update on public.focus_preferences
    for each row
    execute procedure public.handle_updated_at();