import { BadRequestException } from '@nestjs/common';

import {
  BUSINESS_HOUR_END,
  BUSINESS_HOUR_START,
  WORKING_DAYS,
} from '../../scheduling/constants/scheduling.constants';
import { endOfDay, startOfDay } from '../../scheduling/utils/scheduling-time.util';

export interface DateRange {
  startDate: string;
  endDate: string;
  rangeStart: Date;
  rangeEnd: Date;
}

export function parseDateRange(startDate: string, endDate: string): DateRange {
  const rangeStart = startOfDay(new Date(startDate));
  const rangeEnd = endOfDay(new Date(endDate));

  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    throw new BadRequestException('Fechas inválidas');
  }

  if (rangeStart > rangeEnd) {
    throw new BadRequestException('startDate no puede ser posterior a endDate');
  }

  return { startDate, endDate, rangeStart, rangeEnd };
}

export function countWorkingDaysInRange(rangeStart: Date, rangeEnd: Date): number {
  let count = 0;
  const cursor = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);

  while (cursor <= end) {
    if (WORKING_DAYS.includes(cursor.getDay())) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

export function hoursPerWorkingDay(): number {
  return BUSINESS_HOUR_END - BUSINESS_HOUR_START;
}

export function scheduleDurationHours(startTime: Date, endTime: Date): number {
  return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
}

export function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

export function emptyStatusCounts<T extends string>(
  statuses: T[],
): Record<T, number> {
  return statuses.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<T, number>,
  );
}
