import { isActive, overlaps } from './calc.ts';
import type { Lesson } from './model.ts';

// Copy-on-write: каждая операция возвращает новую версию занятия, исходное не меняется.

/** Общий шаг всех правок: копия с изменёнными полями, замороженная. */
const update = (lesson: Lesson, changes: Partial<Lesson>): Lesson => Object.freeze({ ...lesson, ...changes });

export const reschedule = (l: Lesson, date: string, startTime: string, endTime: string): Lesson =>
  update(l, { date, startTime, endTime });

export const cancel = (l: Lesson): Lesson => update(l, { status: 'cancelled' });

export const conduct = (l: Lesson): Lesson => update(l, { status: l.format === 'trial' ? 'trial_conducted' : 'conducted' });

export const withHomework = (l: Lesson, text: string): Lesson => update(l, { homeworkText: text, homeworkDone: false });

export const withHomeworkDone = (l: Lesson): Lesson => update(l, { homeworkDone: true });

export const markPaid = (l: Lesson): Lesson => update(l, { isPaid: true });

/** Новый список, в котором занятие с тем же id заменено; исходный список не меняется. */
export const replaceLesson = (lessons: readonly Lesson[], updated: Lesson): Lesson[] =>
  lessons.map((l) => (l.id === updated.id ? updated : l));

/** Занятие того же преподавателя, пересекающееся с кандидатом (кроме него самого). */
export const findConflict = (lessons: readonly Lesson[], candidate: Lesson): Lesson | undefined =>
  lessons.find((l) => l.id !== candidate.id && l.teacherId === candidate.teacherId && isActive(l.status) && overlaps(l, candidate));
