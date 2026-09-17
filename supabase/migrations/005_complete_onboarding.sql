-- Complete onboarding migration

create or replace function public.complete_onboarding(
    p_goals jsonb,
    p_focus_preset public.focus_preset_type,
    p_custom_focus_minutes integer,
    p_custom_break_minutes integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_goal jsonb;
    v_day jsonb;
    v_goal_id uuid;
begin
    -- =====================================================
    -- 1. AUTHENTICATION
    -- =====================================================

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'User must be authenticated';
    end if;


    -- =====================================================
    -- 2. VALIDATE GOALS
    -- =====================================================

    if p_goals is null
       or jsonb_typeof(p_goals) <> 'array'
       or jsonb_array_length(p_goals) = 0 then
        raise exception 'At least one goal is required';
    end if;


    -- =====================================================
    -- 3. VALIDATE FOCUS SETTINGS
    -- =====================================================

    if p_custom_focus_minutes < 5
       or p_custom_focus_minutes > 180 then
        raise exception 'Focus duration must be between 5 and 180 minutes';
    end if;

    if p_custom_break_minutes < 0
       or p_custom_break_minutes > 60 then
        raise exception 'Break duration must be between 0 and 60 minutes';
    end if;


    -- =====================================================
    -- 4. PREVENT ACCIDENTAL SECOND ONBOARDING
    -- =====================================================

    if exists (
        select 1
        from public.profiles
        where id = v_user_id
          and onboarding_completed = true
    ) then
        raise exception 'Onboarding has already been completed';
    end if;


    -- =====================================================
    -- 5. INSERT GOALS
    -- =====================================================

    for v_goal in
        select value
        from jsonb_array_elements(p_goals)
    loop

        -- Goal name
        if nullif(trim(v_goal ->> 'name'), '') is null then
            raise exception 'Goal name is required';
        end if;

        -- Weekly target
        if coalesce(
            (v_goal ->> 'weekly_target')::integer,
            0
        ) <= 0 then
            raise exception 'Weekly target must be greater than zero';
        end if;

        -- Duration
        if coalesce(
            (v_goal ->> 'default_duration_minutes')::integer,
            0
        ) <= 0 then
            raise exception 'Default duration must be greater than zero';
        end if;

        -- Measurement type
        if (v_goal ->> 'measurement_type')
           not in ('sessions', 'minutes', 'count') then
            raise exception 'Invalid goal measurement type';
        end if;


        insert into public.goals (
            user_id,
            name,
            description,
            icon,
            measurement_type,
            weekly_target,
            default_duration_minutes
        )
        values (
            v_user_id,
            trim(v_goal ->> 'name'),
            nullif(
                trim(v_goal ->> 'description'),
                ''
            ),
            nullif(
                trim(v_goal ->> 'icon'),
                ''
            ),
            (v_goal ->> 'measurement_type')
                ::public.goal_measurement_type,
            (v_goal ->> 'weekly_target')::integer,
            (v_goal ->> 'default_duration_minutes')::integer
        )
        returning id into v_goal_id;


        -- =================================================
        -- 6. INSERT SCHEDULE FOR THIS GOAL
        -- =================================================

        if v_goal ? 'scheduled_days' then

            if jsonb_typeof(
                v_goal -> 'scheduled_days'
            ) <> 'array' then
                raise exception 'scheduled_days must be an array';
            end if;

            for v_day in
                select value
                from jsonb_array_elements(
                    v_goal -> 'scheduled_days'
                )
            loop

                if (v_day #>> '{}')::integer
                   not between 1 and 7 then
                    raise exception 'Schedule day must be between 1 and 7';
                end if;

                insert into public.goal_schedules (
                    goal_id,
                    day_of_week,
                    duration_minutes
                )
                values (
                    v_goal_id,
                    (v_day #>> '{}')::integer,
                    (v_goal ->> 'default_duration_minutes')::integer
                );

            end loop;

        end if;

    end loop;


    -- =====================================================
    -- 7. SAVE FOCUS PREFERENCES
    -- =====================================================

    insert into public.focus_preferences (
        user_id,
        preset,
        custom_focus_minutes,
        custom_break_minutes
    )
    values (
        v_user_id,
        p_focus_preset,
        p_custom_focus_minutes,
        p_custom_break_minutes
    )
    on conflict (user_id)
    do update set
        preset = excluded.preset,
        custom_focus_minutes =
            excluded.custom_focus_minutes,
        custom_break_minutes =
            excluded.custom_break_minutes;


    -- =====================================================
    -- 8. COMPLETE PROFILE ONBOARDING
    -- =====================================================

    update public.profiles
    set onboarding_completed = true
    where id = v_user_id;

    if not found then
        raise exception 'Profile not found';
    end if;

end;
$$;

-- Lock down the RPC

revoke all
on function public.complete_onboarding(
    jsonb,
    public.focus_preset_type,
    integer,
    integer
)
from public;

grant execute
on function public.complete_onboarding(
    jsonb,
    public.focus_preset_type,
    integer,
    integer
)
to authenticated;