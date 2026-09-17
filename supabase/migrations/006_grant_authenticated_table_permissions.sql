-- =========================================================
-- PROFILES
-- =========================================================

grant select, update
on table public.profiles
to authenticated;


-- =========================================================
-- GOALS
-- =========================================================

grant select, insert, update, delete
on table public.goals
to authenticated;


-- =========================================================
-- GOAL SCHEDULES
-- =========================================================

grant select, insert, update, delete
on table public.goal_schedules
to authenticated;


-- =========================================================
-- FOCUS PREFERENCES
-- =========================================================

grant select, insert, update, delete
on table public.focus_preferences
to authenticated;