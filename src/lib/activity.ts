import {
  shiftDateKey,
} from "@/lib/date-utils";

export type ActivityCount = {
  dateKey: string;
  count: number;
};

export type CalendarDay = {
  dateKey: string;
  count: number;
  inRange: boolean;
};

export type CalendarWeek = {
  days: CalendarDay[];
};

export function buildActivityCounts(
  dateKeys: string[]
): Map<string, number> {
  const counts =
    new Map<string, number>();

  for (const dateKey of dateKeys) {
    counts.set(
      dateKey,
      (counts.get(dateKey) ?? 0) + 1
    );
  }

  return counts;
}

/*
 * Build a Monday -> Sunday calendar grid.
 *
 * The final week always contains today.
 */
export function buildActivityCalendar(
  activityCounts: Map<string, number>,
  todayDateKey: string,
  numberOfWeeks = 12
): CalendarWeek[] {
  const todayDayOfWeek =
    getDateKeyDayOfWeek(
      todayDateKey
    );

  /*
   * Find Monday of the current week.
   */
  const currentMonday =
    shiftDateKey(
      todayDateKey,
      -(todayDayOfWeek - 1)
    );

  /*
   * Go back enough weeks so we end with
   * the current week.
   */
  const firstMonday =
    shiftDateKey(
      currentMonday,
      -(numberOfWeeks - 1) * 7
    );

  const weeks: CalendarWeek[] = [];

  for (
    let weekIndex = 0;
    weekIndex < numberOfWeeks;
    weekIndex += 1
  ) {
    const weekStart =
      shiftDateKey(
        firstMonday,
        weekIndex * 7
      );

    const days: CalendarDay[] = [];

    for (
      let dayIndex = 0;
      dayIndex < 7;
      dayIndex += 1
    ) {
      const dateKey =
        shiftDateKey(
          weekStart,
          dayIndex
        );

      days.push({
        dateKey,
        count:
          activityCounts.get(
            dateKey
          ) ?? 0,

        /*
         * Future dates in the current week
         * should look disabled.
         */
        inRange:
          dateKey <=
          todayDateKey,
      });
    }

    weeks.push({
      days,
    });
  }

  return weeks;
}

export function getActivityLevel(
  count: number
): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) {
    return 0;
  }

  if (count === 1) {
    return 1;
  }

  if (count === 2) {
    return 2;
  }

  if (count === 3) {
    return 3;
  }

  return 4;
}

function getDateKeyDayOfWeek(
  dateKey: string
): number {
  const [
    year,
    month,
    day,
  ] = dateKey
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  const jsDay =
    date.getUTCDay();

  /*
   * Convert:
   *
   * JS Sunday = 0
   *
   * to:
   *
   * Monday = 1
   * ...
   * Sunday = 7
   */
  return jsDay === 0
    ? 7
    : jsDay;
}