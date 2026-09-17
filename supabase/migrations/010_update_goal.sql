-- Update goal details and replace its schedule in one transaction.
-- Completion records and focus sessions are preserved.
create or replace function public.update_goal(
    p_goal_id uuid,
    p_name text,
    p_description text,
    p_icon text,
    p_measurement_type public.goal_measurement_type,
    p_weekly_target integer,
    p_default_duration_minutes integer,
    p_scheduled_days integer[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        raise exception 'User must be authenticated';
    end if;

    if nullif(pg_catalog.btrim(p_name), '') is null then
        raise exception 'Goal name is required';
    end if;

    if p_measurement_type is null then
        raise exception 'Measurement type is required';
    end if;

    if p_weekly_target is null or p_weekly_target <= 0 then
        raise exception 'Weekly target must be greater than zero';
    end if;

    if p_default_duration_minutes is null
       or p_default_duration_minutes not between 1 and 180 then
        raise exception 'Duration must be between 1 and 180 minutes';
    end if;

    if exists (
        select 1
        from pg_catalog.unnest(p_scheduled_days) as days(day_number)
        where day_number is null or day_number not between 1 and 7
    ) then
        raise exception 'Schedule days must be between 1 and 7';
    end if;

    -- Serialize edits to this goal and verify ownership before any changes.
    perform id
    from public.goals
    where id = p_goal_id and user_id = v_user_id
    for update;

    if not found then
        raise exception 'Goal not found or unavailable';
    end if;

    update public.goals
    set name = pg_catalog.btrim(p_name),
        description = nullif(pg_catalog.btrim(p_description), ''),
        icon = nullif(pg_catalog.btrim(p_icon), ''),
        measurement_type = p_measurement_type,
        weekly_target = p_weekly_target,
        default_duration_minutes = p_default_duration_minutes
    where id = p_goal_id and user_id = v_user_id;

    delete from public.goal_schedules
    where goal_id = p_goal_id;

    insert into public.goal_schedules (
        goal_id, day_of_week, duration_minutes
    )
    select distinct p_goal_id, day_number, p_default_duration_minutes
    from pg_catalog.unnest(p_scheduled_days) as days(day_number);

    return p_goal_id;
end;
$$;

revoke all on function public.update_goal(
    uuid, text, text, text, public.goal_measurement_type,
    integer, integer, integer[]
) from public, anon;

grant execute on function public.update_goal(
    uuid, text, text, text, public.goal_measurement_type,
    integer, integer, integer[]
) to authenticated;
