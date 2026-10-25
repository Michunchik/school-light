import type { Rates } from './calc.ts';

export type LessonStatus = 'planned' | 'conducted' | 'trial_conducted' | 'cancelled' | 'rescheduled';
export type Format = 'individual' | 'group' | 'intensive' | 'curatorship' | 'trial';

/**
 * Занятие как значение: поля только для чтения, ссылки на людей заменены идентификаторами.
 * Изменённая версия занятия создаётся заново (см. lessons.ts), старая остаётся прежней.
 */
export interface Lesson {
  readonly id: number;
  readonly teacherId: number;
  readonly studentId: number | null;
  readonly groupId: number | null;
  readonly date: string; // YYYY-MM-DD
  readonly startTime: string; // HH:MM
  readonly endTime: string;
  readonly format: Format;
  readonly subject: string;
  readonly topic: string;
  readonly status: LessonStatus;
  readonly homeworkText: string;
  readonly homeworkDone: boolean;
  readonly isPaid: boolean;
}

/** Всё, что задаёт пользователь при создании занятия, одним объектом с именами полей. */
export interface NewLesson {
  teacherId: number;
  studentId?: number;
  groupId?: number;
  date: string;
  startTime: string;
  endTime: string;
  format: Format;
  subject: string;
  topic?: string;
}

/** Конструктор занятия: единственное место, где задаются начальные значения. */
export function createLesson(id: number, req: NewLesson): Lesson {
  return Object.freeze({
    id,
    teacherId: req.teacherId,
    studentId: req.studentId ?? null,
    groupId: req.groupId ?? null,
    date: req.date,
    startTime: req.startTime,
    endTime: req.endTime,
    format: req.format,
    subject: req.subject,
    topic: req.topic ?? '',
    status: 'planned',
    homeworkText: '',
    homeworkDone: false,
    isPaid: false,
  });
}

export class Teacher {
  readonly id: number;
  readonly name: string;
  readonly rates: Rates; // свои ставки за час; пусто = общие ставки школы

  constructor(id: number, name: string, rates: Rates = {}) {
    this.id = id;
    this.name = name;
    this.rates = Object.freeze({ ...rates });
  }
}

export class Student {
  readonly id: number;
  readonly name: string;

  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }
}

export class Group {
  readonly id: number;
  readonly name: string;
  readonly studentIds: readonly number[];

  constructor(id: number, name: string, studentIds: readonly number[]) {
    this.id = id;
    this.name = name;
    this.studentIds = Object.freeze([...new Set(studentIds)]);
  }
}
