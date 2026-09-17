const WEEKDAY_MAP: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export type DateRange = {
  start: string;
  end: string;
};

export type LocalCalendarDate = {
  year: number;
  month: number;
  day: number;
};

export function getLocalDayOfWeek(
  date: Date,
  timeZone: string
): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);

  return WEEKDAY_MAP[weekday] ?? 1;
}

export function getLocalHour(
  date: Date,
  timeZone: string
): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date)
  );
}

export function formatLocalDate(
  date: Date,
  timeZone: string
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

/*
 * Returns YYYY-MM-DD according to the user's timezone.
 *
 * This becomes the canonical key for streak/calendar logic.
 */
export function getLocalDateKey(
  date: Date,
  timeZone: string
): string {
  const parts = getLocalDateParts(date, timeZone);

  return buildDateKey(
    parts.year,
    parts.month,
    parts.day
  );
}

/*
 * Move a local calendar date by N days.
 *
 * Important:
 * We perform calendar arithmetic using UTC only as a
 * neutral calendar representation. This prevents the
 * server's own timezone from affecting the result.
 */
export function shiftDateKey(
  dateKey: string,
  amount: number
): string {
  const [year, month, day] = dateKey
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  date.setUTCDate(
    date.getUTCDate() + amount
  );

  return buildDateKey(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  );
}

/*
 * Difference between two YYYY-MM-DD calendar keys.
 *
 * Example:
 * 2026-09-17 -> 2026-09-18 = 1
 */
export function differenceInCalendarDays(
  earlierDateKey: string,
  laterDateKey: string
): number {
  const earlier =
    dateKeyToUtcCalendarDate(earlierDateKey);

  const later =
    dateKeyToUtcCalendarDate(laterDateKey);

  const milliseconds =
    later.getTime() - earlier.getTime();

  return Math.round(
    milliseconds / 86_400_000
  );
}

export function getLocalDayRange(
  now: Date,
  timeZone: string
): DateRange {
  const localParts = getLocalDateParts(
    now,
    timeZone
  );

  const calendarDate = new Date(
    Date.UTC(
      localParts.year,
      localParts.month - 1,
      localParts.day
    )
  );

  const nextDate = new Date(calendarDate);

  nextDate.setUTCDate(
    calendarDate.getUTCDate() + 1
  );

  return {
    start: localMidnightToUtcIso(
      calendarDate,
      timeZone
    ),
    end: localMidnightToUtcIso(
      nextDate,
      timeZone
    ),
  };
}

export function getLocalWeekRange(
  now: Date,
  timeZone: string
): DateRange {
  const localParts = getLocalDateParts(
    now,
    timeZone
  );

  const localDateAsUtc = new Date(
    Date.UTC(
      localParts.year,
      localParts.month - 1,
      localParts.day
    )
  );

  const jsDay =
    localDateAsUtc.getUTCDay();

  const mondayOffset =
    jsDay === 0 ? -6 : 1 - jsDay;

  const monday = new Date(
    localDateAsUtc
  );

  monday.setUTCDate(
    localDateAsUtc.getUTCDate() +
      mondayOffset
  );

  const nextMonday = new Date(monday);

  nextMonday.setUTCDate(
    monday.getUTCDate() + 7
  );

  return {
    start: localMidnightToUtcIso(
      monday,
      timeZone
    ),
    end: localMidnightToUtcIso(
      nextMonday,
      timeZone
    ),
  };
}

/*
 * Returns an ISO timestamp representing midnight N
 * calendar days before/after the user's current local day.
 *
 * Useful for bounded activity queries.
 */
export function getLocalDayOffsetStart(
  now: Date,
  timeZone: string,
  offset: number
): string {
  const parts = getLocalDateParts(
    now,
    timeZone
  );

  const calendarDate = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day
    )
  );

  calendarDate.setUTCDate(
    calendarDate.getUTCDate() + offset
  );

  return localMidnightToUtcIso(
    calendarDate,
    timeZone
  );
}

function getLocalDateParts(
  date: Date,
  timeZone: string
): LocalCalendarDate {
  const formatter =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const parts =
    formatter.formatToParts(date);

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function localMidnightToUtcIso(
  calendarDate: Date,
  timeZone: string
): string {
  const year =
    calendarDate.getUTCFullYear();

  const month =
    calendarDate.getUTCMonth();

  const day =
    calendarDate.getUTCDate();

  let guess = Date.UTC(
    year,
    month,
    day,
    0,
    0,
    0
  );

  for (
    let iteration = 0;
    iteration < 2;
    iteration += 1
  ) {
    const parts =
      getZonedDateTimeParts(
        new Date(guess),
        timeZone
      );

    const representedAsUtc =
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
      );

    const desiredAsUtc =
      Date.UTC(
        year,
        month,
        day,
        0,
        0,
        0
      );

    guess +=
      desiredAsUtc -
      representedAsUtc;
  }

  return new Date(guess).toISOString();
}

function getZonedDateTimeParts(
  date: Date,
  timeZone: string
) {
  const formatter =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

  const parts =
    formatter.formatToParts(date);

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function buildDateKey(
  year: number,
  month: number,
  day: number
): string {
  return [
    year.toString().padStart(4, "0"),
    month.toString().padStart(2, "0"),
    day.toString().padStart(2, "0"),
  ].join("-");
}

function dateKeyToUtcCalendarDate(
  dateKey: string
): Date {
  const [year, month, day] = dateKey
    .split("-")
    .map(Number);

  return new Date(
    Date.UTC(year, month - 1, day)
  );
}