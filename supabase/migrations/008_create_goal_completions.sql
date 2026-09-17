create table public.goal_completions (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    goal_id uuid not null
        references public.goals(id)
        on delete cascade,

    quantity integer not null default 1
        check (quantity > 0),

    note text
        check (
            note is null
            or char_length(note) <= 200
        ),

    completed_at timestamptz not null default now(),

    created_at timestamptz not null default now()
);

alter table public.goal_completions
enable row level security;


create policy "Users can view their own goal completions"
on public.goal_completions
for select
to authenticated
using (
    (select auth.uid()) = user_id
);


create policy "Users can create their own goal completions"
on public.goal_completions
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
    and exists (
        select 1
        from public.goals
        where goals.id = goal_completions.goal_id
          and goals.user_id = (select auth.uid())
    )
);


create policy "Users can update their own goal completions"
on public.goal_completions
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
    and exists (
        select 1
        from public.goals
        where goals.id = goal_completions.goal_id
          and goals.user_id = (select auth.uid())
    )
);


create policy "Users can delete their own goal completions"
on public.goal_completions
for delete
to authenticated
using (
    (select auth.uid()) = user_id
);


grant select, insert, update, delete
on table public.goal_completions
to authenticated;


create index goal_completions_user_completed_at_idx
on public.goal_completions (
    user_id,
    completed_at desc
);


create index goal_completions_user_goal_completed_at_idx
on public.goal_completions (
    user_id,
    goal_id,
    completed_at desc
);