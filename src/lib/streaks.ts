import {
  differenceInCalendarDays,
  shiftDateKey,
} from "@/lib/date-utils";

export type ActivityDay = {
  dateKey: string;
  active: boolean;
};

export type StreakResult = {
  currentStreak: number;
  longestStreak: number;
};

export function calculateStreaks(
  activeDateKeys: string[],
  todayDateKey: string
): StreakResult {
  const uniqueDates = Array.from(
    new Set(activeDateKeys)
  ).sort();

  if (uniqueDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
    };
  }

  const activeDates = new Set(uniqueDates);

  /*
   * LONGEST STREAK
   */
  let longestStreak = 1;
  let runningStreak = 1;

  for (
    let index = 1;
    index < uniqueDates.length;
    index += 1
  ) {
    const previous =
      uniqueDates[index - 1];

    const current =
      uniqueDates[index];

    const difference =
      differenceInCalendarDays(
        previous,
        current
      );

    if (difference === 1) {
      runningStreak += 1;

      longestStreak = Math.max(
        longestStreak,
        runningStreak
      );
    } else {
      runningStreak = 1;
    }
  }

  /*
   * CURRENT STREAK
   *
   * If the user has activity today, count backwards
   * starting today.
   *
   * If they haven't done anything yet today, allow the
   * current streak to continue from yesterday. This
   * prevents the streak from showing 0 every morning
   * before the user has had a chance to work.
   */
  const yesterdayDateKey =
    shiftDateKey(todayDateKey, -1);

  let cursor: string;

  if (activeDates.has(todayDateKey)) {
    cursor = todayDateKey;
  } else if (
    activeDates.has(yesterdayDateKey)
  ) {
    cursor = yesterdayDateKey;
  } else {
    return {
      currentStreak: 0,
      longestStreak,
    };
  }

  let currentStreak = 0;

  while (activeDates.has(cursor)) {
    currentStreak += 1;

    cursor = shiftDateKey(
      cursor,
      -1
    );
  }

  return {
    currentStreak,
    longestStreak,
  };
}

export function buildActivityStrip(
  activeDateKeys: string[],
  todayDateKey: string,
  days = 7
): ActivityDay[] {
  const activeDates =
    new Set(activeDateKeys);

  const result: ActivityDay[] = [];

  for (
    let offset = -(days - 1);
    offset <= 0;
    offset += 1
  ) {
    const dateKey =
      shiftDateKey(
        todayDateKey,
        offset
      );

    result.push({
      dateKey,
      active:
        activeDates.has(dateKey),
    });
  }

  return result;
}