import { Group } from './group.ts';
import { Lesson } from './lesson.ts';
import type { Format } from './lesson.ts';
import type { School } from './school.ts';
import type { Student } from './student.ts';

const DEFAULT_RATES: Record<string, number> = {
  individual: 600,
  group: 1200,
  intensive: 900,
  curatorship: 400,
  trial: 300,
};

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

  /** Своя ставка → общая ставка школы → значение по умолчанию. */
  rateFor(format: string): number {
    const own = this.rates[format];
    if (own > 0) return own;
    const shared = this.school.rates[format];
    if (shared > 0) return shared;
    return DEFAULT_RATES[format] ?? 600;
  }

  /** Считает ставку и сумму и записывает их в занятие. */
  fillPayout(lesson: Lesson): void {
    if (!lesson.isActive()) {
      lesson.rateApplied = 0;
      lesson.payoutAmount = 0;
      return;
    }
    const isTrial =
      lesson.status === 'trial_conducted' || lesson.format === 'trial' || lesson.topic.toLowerCase().includes('пробн');
    if (isTrial) {
      lesson.rateApplied = this.rateFor('trial');
      lesson.payoutAmount = lesson.rateApplied;
      return;
    }
    lesson.rateApplied = this.rateFor(lesson.format);
    lesson.payoutAmount = Math.round((lesson.durationMinutes() / 60) * lesson.rateApplied);
  }

  /**
   * Зарплата за период. Без аргументов — с начала текущего месяца по «сегодня».
   * Попутно обновляет суммы в занятиях, остаток к выплате и текст отчёта.
   */
  calculatePayout(from?: string, to?: string): number {
    const end = to ?? this.school.today;
    const start = from ?? end.slice(0, 7) + '-01';
    let total = 0;
    let unpaid = 0;
    let count = 0;
    for (const lesson of this.lessons) {
      if (lesson.date < start || lesson.date > end) continue;
      this.fillPayout(lesson);
      if (lesson.status === 'conducted' || lesson.status === 'trial_conducted') {
        total += lesson.payoutAmount;
        count += 1;
        if (!lesson.isPaid) unpaid += lesson.payoutAmount;
      }
    }
    this.balanceDue = unpaid;
    this.lastReport = `${this.name}: ${start}..${end}, занятий ${count}, итого ${total} ₽, не выплачено ${unpaid} ₽`;
    console.log(this.lastReport);
    return total;
  }

  /** Отмечает все проведённые занятия периода выплаченными. */
  markPaid(from: string, to: string): number {
    let paid = 0;
    for (const lesson of this.lessons) {
      if (lesson.date < from || lesson.date > to) continue;
      if ((lesson.status === 'conducted' || lesson.status === 'trial_conducted') && !lesson.isPaid) {
        lesson.isPaid = true;
        paid += lesson.payoutAmount;
      }
    }
    this.balanceDue -= paid;
    return paid;
  }

  /** Свободные окна на дату внутри рабочего дня; короче minMinutes не показываем. */
  findFreeWindows(date: string, dayStart = '09:00', dayEnd = '21:00', minMinutes = 60): string[] {
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const busy = this.lessons
      .filter((l) => l.date === date && l.isActive())
      .sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
    const windows: string[] = [];
    let cursor = toMin(dayStart);
    for (const l of busy) {
      if (toMin(l.startTime) - cursor >= minMinutes) windows.push(`${fmt(cursor)}-${l.startTime}`);
      cursor = Math.max(cursor, toMin(l.endTime));
    }
    if (toMin(dayEnd) - cursor >= minMinutes) windows.push(`${fmt(cursor)}-${dayEnd}`);
    return windows;
  }

  /** Пары пересекающихся занятий (бывает после ручных правок данных). */
  findConflicts(): Array<[Lesson, Lesson]> {
    const active = this.lessons.filter((l) => l.isActive());
    const pairs: Array<[Lesson, Lesson]> = [];
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        if (active[i].overlaps(active[j])) pairs.push([active[i], active[j]]);
      }
    }
    return pairs;
  }
}
