// Вычисления: всё нужное приходит аргументами, результат уходит через return.
// Нет обращений к объектам школы, к консоли и к текущему времени, поэтому каждую функцию
// можно проверить одним вызовом и применить где угодно.

export type Rates = Record<string, number | undefined>;

export interface PayableLesson {
  status: string;
  format: string;
  topic: string;
  startTime: string;
  endTime: string;
}

export interface PayoutLine {
  status: string;
  payoutAmount: number;
  isPaid: boolean;
}

export interface Interval {
  startTime: string;
  endTime: string;
}

export const DEFAULT_RATES: Record<string, number> = {
  individual: 600,
  group: 1200,
  intensive: 900,
  curatorship: 400,
  trial: 300,
};

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const durationMinutes = (startTime: string, endTime: string): number =>
  Math.max(15, toMinutes(endTime) - toMinutes(startTime));

export const isActive = (status: string): boolean => status !== 'cancelled' && status !== 'rescheduled';

export const isCountable = (status: string): boolean => status === 'conducted' || status === 'trial_conducted';

export const overlaps = (a: Interval & { date: string }, b: Interval & { date: string }): boolean =>
  a.date === b.date && a.startTime < b.endTime && b.startTime < a.endTime;

/** Своя ставка → общая ставка школы → значение по умолчанию. */
export function resolveRate(format: string, own: Rates, shared: Rates): number {
  const mine = own[format];
  if (mine !== undefined && mine > 0) return mine;
  const common = shared[format];
  if (common !== undefined && common > 0) return common;
  return DEFAULT_RATES[format] ?? 600;
}

export function isTrial(lesson: PayableLesson): boolean {
  return lesson.status === 'trial_conducted' || lesson.format === 'trial' || lesson.topic.toLowerCase().includes('пробн');
}

/** Ставка и сумма за занятие. Отменённое и перенесённое стоят ноль, пробное оплачивается фиксированно. */
export function calculateLessonPayout(
  lesson: PayableLesson,
  teacherRates: Rates,
  schoolRates: Rates,
): { rate: number; amount: number } {
  if (!isActive(lesson.status)) return { rate: 0, amount: 0 };
  if (isTrial(lesson)) {
    const rate = resolveRate('trial', teacherRates, schoolRates);
    return { rate, amount: rate };
  }
  const rate = resolveRate(lesson.format, teacherRates, schoolRates);
  return { rate, amount: Math.round((durationMinutes(lesson.startTime, lesson.endTime) / 60) * rate) };
}

/** Границы периода: без аргументов с начала месяца «сегодня» до «сегодня». */
export function resolvePeriod(from: string | undefined, to: string | undefined, today: string): { from: string; to: string } {
  const end = to ?? today;
  return { from: from ?? end.slice(0, 7) + '-01', to: end };
}

export const inPeriod = (date: string, from: string, to: string): boolean => date >= from && date <= to;

/** Итоги по строкам ведомости: считаются только проведённые занятия. */
export function summarizePayout(lines: PayoutLine[]): { total: number; unpaid: number; count: number } {
  let total = 0;
  let unpaid = 0;
  let count = 0;
  for (const line of lines) {
    if (!isCountable(line.status)) continue;
    total += line.payoutAmount;
    count += 1;
    if (!line.isPaid) unpaid += line.payoutAmount;
  }
  return { total, unpaid, count };
}

export function formatPayoutReport(
  name: string,
  period: { from: string; to: string },
  summary: { total: number; unpaid: number; count: number },
): string {
  return `${name}: ${period.from}..${period.to}, занятий ${summary.count}, итого ${summary.total} ₽, не выплачено ${summary.unpaid} ₽`;
}

/** Свободные окна дня между занятыми интервалами; короче minMinutes не показываем. */
export function freeWindows(busy: Interval[], dayStart: string, dayEnd: string, minMinutes: number): string[] {
  const sorted = [...busy].sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
  const windows: string[] = [];
  let cursor = toMinutes(dayStart);
  for (const b of sorted) {
    if (toMinutes(b.startTime) - cursor >= minMinutes) windows.push(`${toHHMM(cursor)}-${b.startTime}`);
    cursor = Math.max(cursor, toMinutes(b.endTime));
  }
  if (toMinutes(dayEnd) - cursor >= minMinutes) windows.push(`${toHHMM(cursor)}-${dayEnd}`);
  return windows;
}

/** Пары пересекающихся занятий (по индексам входного списка). */
export function overlappingPairs<T extends Interval & { date: string }>(items: T[]): Array<[T, T]> {
  const pairs: Array<[T, T]> = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (overlaps(items[i], items[j])) pairs.push([items[i], items[j]]);
    }
  }
  return pairs;
}

export interface HomeworkLine {
  status: string;
  homeworkText: string;
  homeworkDone: boolean;
}

export const hasPendingHomework = (l: HomeworkLine): boolean =>
  l.homeworkText !== '' && !l.homeworkDone && isActive(l.status);

export function studentStats(
  lessons: Array<HomeworkLine & Interval>,
): { conducted: number; cancelled: number; hours: number; pending: number } {
  let conducted = 0;
  let cancelled = 0;
  let minutes = 0;
  let pending = 0;
  for (const l of lessons) {
    if (isCountable(l.status)) {
      conducted += 1;
      minutes += durationMinutes(l.startTime, l.endTime);
    } else if (l.status === 'cancelled') {
      cancelled += 1;
    }
    if (hasPendingHomework(l)) pending += 1;
  }
  return { conducted, cancelled, hours: Math.round((minutes / 60) * 10) / 10, pending };
}

export function groupStats(lessons: HomeworkLine[]): { conducted: number; withHomework: number; homeworkDone: number } {
  let conducted = 0;
  let withHomework = 0;
  let homeworkDone = 0;
  for (const l of lessons) {
    if (l.status === 'conducted') conducted += 1;
    if (l.homeworkText !== '' && isActive(l.status)) {
      withHomework += 1;
      if (l.homeworkDone) homeworkDone += 1;
    }
  }
  return { conducted, withHomework, homeworkDone };
}

export function formatStudentReport(name: string, s: ReturnType<typeof studentStats>): string {
  return [
    `Отчёт: ${name}`,
    `  проведено занятий: ${s.conducted}, отменено: ${s.cancelled}, часов: ${s.hours}`,
    `  ДЗ ждёт выполнения: ${s.pending}`,
  ].join('\n');
}

export function formatGroupReport(name: string, students: number, s: ReturnType<typeof groupStats>): string {
  return [
    `Группа «${name}»: учеников ${students}`,
    `  проведено занятий: ${s.conducted}, ДЗ выдано: ${s.withHomework}, сделано: ${s.homeworkDone}`,
  ].join('\n');
}
