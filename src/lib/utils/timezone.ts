import moment from 'moment-timezone';

const AUSTRALIA_SYDNEY_TZ = 'Australia/Sydney';

export function toSydneyTime(date: Date): Date {
  return moment.tz(date, AUSTRALIA_SYDNEY_TZ).toDate();
}

export function fromSydneyTime(date: Date): Date {
  return moment.tz(date, AUSTRALIA_SYDNEY_TZ).utc().toDate();
}

export function formatSydneyDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  return moment.tz(date, AUSTRALIA_SYDNEY_TZ).format(format);
}

export function getStartOfWeek(date: Date = new Date()): Date {
  return moment.tz(date, AUSTRALIA_SYDNEY_TZ).startOf('isoWeek').toDate();
}

export function getEndOfWeek(date: Date = new Date()): Date {
  return moment.tz(date, AUSTRALIA_SYDNEY_TZ).endOf('isoWeek').toDate();
}

export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  return {
    start: getStartOfWeek(date),
    end: getEndOfWeek(date),
  };
}

export function addWeeks(date: Date, weeks: number): Date {
  return moment.tz(date, AUSTRALIA_SYDNEY_TZ).add(weeks, 'weeks').toDate();
}

export function isWorkingDay(date: Date): boolean {
  const dayOfWeek = moment.tz(date, AUSTRALIA_SYDNEY_TZ).isoWeekday();
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

export function getWeekNumber(date: Date = new Date()): number {
  return moment.tz(date, AUSTRALIA_SYDNEY_TZ).isoWeek();
}

