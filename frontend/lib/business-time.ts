export const BUSINESS_TIME_ZONE = "America/Costa_Rica";

type BusinessDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function businessDateTimeParts(value: Date): BusinessDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const partByType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(partByType.get("year")),
    month: Number(partByType.get("month")),
    day: Number(partByType.get("day")),
    hour: Number(partByType.get("hour")),
    minute: Number(partByType.get("minute")),
    second: Number(partByType.get("second")),
  };
}

export function businessDateTimeUtc(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const parts = businessDateTimeParts(utcGuess);
  const zonedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return new Date(utcGuess.getTime() - (zonedAsUtc - utcGuess.getTime()));
}

export function startOfBusinessDay(value: Date): Date {
  const parts = businessDateTimeParts(value);
  return businessDateTimeUtc(parts.year, parts.month, parts.day);
}

export function addBusinessDays(value: Date, days: number): Date {
  const parts = businessDateTimeParts(value);
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return businessDateTimeUtc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function startOfBusinessWeek(value: Date): Date {
  const date = startOfBusinessDay(value);
  const parts = businessDateTimeParts(date);
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  const dayOffset = (weekday + 6) % 7;
  return addBusinessDays(date, -dayOffset);
}

export function endOfBusinessWeek(value: Date): Date {
  return addBusinessDays(startOfBusinessWeek(value), 7);
}

export function startOfBusinessMonth(value: Date): Date {
  const parts = businessDateTimeParts(value);
  return businessDateTimeUtc(parts.year, parts.month, 1);
}

export function endOfBusinessMonth(value: Date): Date {
  const parts = businessDateTimeParts(value);
  const nextMonth = new Date(Date.UTC(parts.year, parts.month, 1));
  return businessDateTimeUtc(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 1);
}

export function formatBusinessInputDateTime(value: Date): string {
  const parts = businessDateTimeParts(value);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function businessInputDateTimeToIso(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    throw new Error("Invalid datetime-local value.");
  }

  return businessDateTimeUtc(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? 0),
  ).toISOString();
}
