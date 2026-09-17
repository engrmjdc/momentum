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
    jsDay === 0
      ? -6
      : 1 - jsDay;

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

function getLocalDateParts(
  date: Date,
  timeZone: string
) {
  const formatter =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const parts =
    formatter.formatToParts(date);

  const values: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] =
        part.value;
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

  /*
   * Two passes allow the timezone offset to settle,
   * including DST changes.
   */
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

  return new Date(
    guess
  ).toISOString();
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

  const values: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] =
        part.value;
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