export const GROUP_TIMEZONE = "America/Denver";

function getDateFormatter(timeZone: string = GROUP_TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function getDateStringInTimeZone(
  date: Date = new Date(),
  timeZone: string = GROUP_TIMEZONE
) {
  return getDateFormatter(timeZone).format(date);
}

export function getTodayDateInMountainTime() {
  return getDateStringInTimeZone(new Date(), GROUP_TIMEZONE);
}

export function getYesterdayDateInMountainTime() {
  return addDaysToDateString(getTodayDateInMountainTime(), -1);
}

export function dateStringToUtcDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function addDaysToDateString(dateString: string, days: number) {
  const date = dateStringToUtcDate(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return getDateStringInTimeZone(date, "UTC");
}

export function diffCalendarDays(startDate: string, endDate: string) {
  const start = dateStringToUtcDate(startDate);
  const end = dateStringToUtcDate(endDate);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function formatDisplayDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: GROUP_TIMEZONE,
    ...options,
  }).format(dateStringToUtcDate(dateString));
}

export function isCorrectionWindowOpen(targetDate: string) {
  return getTodayDateInMountainTime() === addDaysToDateString(targetDate, 1);
}

export function getCorrectionDeadlineLabel(targetDate: string) {
  return formatDisplayDate(addDaysToDateString(targetDate, 1), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
