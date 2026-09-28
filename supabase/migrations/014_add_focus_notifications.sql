alter table public.focus_preferences
add column if not exists completion_sound_enabled boolean not null default true,
add column if not exists browser_notifications_enabled boolean not null default false;
