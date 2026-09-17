create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,

    display_name text,
    avatar_url text,

    timezone text not null default 'Asia/Manila',

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles
enable row level security;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    insert into public.profiles (
        id,
        display_name
    )
    values (
        new.id,
        new.raw_user_meta_data ->> 'display_name'
    );

    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_handle_updated_at
    before update on public.profiles
    for each row
    execute procedure public.handle_updated_at();


