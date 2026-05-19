import {
  BUSINESS_HOUR_END,
  BUSINESS_HOUR_START,
  CLASS_DURATION_MS,
  WORKING_DAYS,
} from '../constants/scheduling.constants';

export function addMs(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isWorkingDay(date: Date): boolean {
  return WORKING_DAYS.includes(date.getDay());
}

export function buildSlotStart(date: Date, hour: number): Date {
  const slot = new Date(date);
  slot.setHours(hour, 0, 0, 0);
  return slot;
}

/** Genera slots de 1h entre 7:00 y 18:00 (última clase termina a las 19:00). */
export function generateBusinessSlotsForDate(date: Date): { startTime: Date; endTime: Date }[] {
  const slots: { startTime: Date; endTime: Date }[] = [];

  for (let hour = BUSINESS_HOUR_START; hour < BUSINESS_HOUR_END; hour++) {
    const startTime = buildSlotStart(date, hour);
    const endTime = addMs(startTime, CLASS_DURATION_MS);
    if (endTime.getHours() > BUSINESS_HOUR_END || (endTime.getHours() === BUSINESS_HOUR_END && endTime.getMinutes() > 0)) {
      break;
    }
    slots.push({ startTime, endTime });
  }

  return slots;
}

export function datesInRange(from: Date, days: number): Date[] {
  const result: Date[] = [];
  const cursor = startOfDay(from);

  for (let i = 0; i < days; i++) {
    const day = addMs(cursor, i * 24 * 60 * 60 * 1000);
    if (isWorkingDay(day)) {
      result.push(day);
    }
  }

  return result;
}

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
