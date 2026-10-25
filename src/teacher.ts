import {
  calculateLessonPayout,
  formatPayoutReport,
  freeWindows,
  inPeriod,
  isCountable,
  overlappingPairs,
  resolvePeriod,
  resolveRate,
  summarizePayout,
} from './calc.ts';
import { Group } from './group.ts';
import { Lesson } from './lesson.ts';
import type { Format } from './lesson.ts';
import type { School } from './school.ts';
import type { Student } from './student.ts';

export class Teacher {
  name: string;
  school: School;
  rates: Record<string, number>; // свои ставки за час; пусто = общие ставки школы
  lessons: Lesson[];
  balanceDue: number; // невыплаченное по последнему расчёту
  lastReport: string; // текст последнего расчёта

  constructor(name: string, school: School) {
    this.name = name;
    this.school = school;
    this.rates = {};
    this.lessons = [];
    this.balanceDue = 0;
    this.lastReport = '';
  }

  /** Назначает занятие ученику или группе; при пересечении по времени отказывает. */
  scheduleLesson(
    who: Student | Group,
    date: string,
    startTime: string,
    endTime: string,
    format: Format,
    subject: string,
    topic: string,
  ): Lesson | null {
    const isGroup = who instanceof Group;
    const lesson = new Lesson(
      this.school.nextLessonId,
      this,
      isGroup ? null : who,
      isGroup ? who : null,
      date,
      startTime,
      endTime,
      format,
      subject,
      topic,
    );
    if (this.lessons.some((l) => l.isActive() && l.overlaps(lesson))) {
      console.log(`Конфликт: у ${this.name} уже есть занятие ${date} ${startTime}-${endTime}`);
      return null;
    }
    this.school.nextLessonId += 1;
    this.lessons.push(lesson);
    this.school.lessons.push(lesson);
    if (isGroup) who.lessons.push(lesson);
    else who.lessons.push(lesson);
    return lesson;
  }

  /** Переносит занятие на другое время (меняет само занятие). */
  rescheduleLesson(lesson: Lesson, date: string, startTime: string, endTime: string): boolean {
    const probe = new Lesson(-1, this, null, null, date, startTime, endTime, lesson.format, lesson.subject, lesson.topic);
    if (this.lessons.some((l) => l !== lesson && l.isActive() && l.overlaps(probe))) {
      console.log(`Конфликт: нельзя перенести урок ${lesson.id} на ${date} ${startTime}-${endTime}`);
      return false;
    }
    lesson.date = date;
    lesson.startTime = startTime;
    lesson.endTime = endTime;
    return true;
  }

  cancelLesson(lesson: Lesson): void {
    lesson.status = 'cancelled';
    lesson.rateApplied = 0;
    lesson.payoutAmount = 0;
  }

  /** Отмечает занятие проведённым и сразу записывает в него сумму выплаты. */
  conductLesson(lesson: Lesson): void {
    lesson.status = lesson.format === 'trial' ? 'trial_conducted' : 'conducted';
    this.fillPayout(lesson);
    console.log(`Урок ${lesson.id} проведён, к выплате ${lesson.payoutAmount} ₽`);
  }

  assignHomework(lesson: Lesson, text: string): void {
    lesson.homeworkText = text;
    lesson.homeworkDone = false;
  }

  /** Ставка по формату: считает чистая функция. */
  rateFor(format: string): number {
    return resolveRate(format, this.rates, this.school.rates);
  }

  /** Записывает в занятие ставку и сумму, посчитанные чистой функцией. */
  fillPayout(lesson: Lesson): void {
    const { rate, amount } = calculateLessonPayout(lesson, this.rates, this.school.rates);
    lesson.rateApplied = rate;
    lesson.payoutAmount = amount;
  }

  /**
   * Зарплата за период. Без аргументов — с начала текущего месяца по «сегодня».
   * Действие: обновляет суммы в занятиях, остаток и текст отчёта; арифметика вынесена в calc.ts.
   */
  calculatePayout(from?: string, to?: string): number {
    const period = resolvePeriod(from, to, this.school.today);
    const inRange = this.lessons.filter((l) => inPeriod(l.date, period.from, period.to));
    for (const lesson of inRange) this.fillPayout(lesson);
    const summary = summarizePayout(inRange);
    this.balanceDue = summary.unpaid;
    this.lastReport = formatPayoutReport(this.name, period, summary);
    console.log(this.lastReport);
    return summary.total;
  }

  /** Отмечает все проведённые занятия периода выплаченными. */
  markPaid(from: string, to: string): number {
    let paid = 0;
    for (const lesson of this.lessons) {
      if (!inPeriod(lesson.date, from, to)) continue;
      if (isCountable(lesson.status) && !lesson.isPaid) {
        lesson.isPaid = true;
        paid += lesson.payoutAmount;
      }
    }
    this.balanceDue -= paid;
    return paid;
  }

  /** Свободные окна на дату внутри рабочего дня; расчёт в calc.ts. */
  findFreeWindows(date: string, dayStart = '09:00', dayEnd = '21:00', minMinutes = 60): string[] {
    const busy = this.lessons.filter((l) => l.date === date && l.isActive());
    return freeWindows(busy, dayStart, dayEnd, minMinutes);
  }

  /** Пары пересекающихся занятий (бывает после ручных правок данных). */
  findConflicts(): Array<[Lesson, Lesson]> {
    return overlappingPairs(this.lessons.filter((l) => l.isActive()));
  }
}
