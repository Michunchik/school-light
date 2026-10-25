import type { Group } from './group.ts';
import type { Student } from './student.ts';
import type { Teacher } from './teacher.ts';

export type LessonStatus = 'planned' | 'conducted' | 'trial_conducted' | 'cancelled' | 'rescheduled';
export type Format = 'individual' | 'group' | 'intensive' | 'curatorship' | 'trial';

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Занятие: один преподаватель и либо один ученик, либо группа. */
export class Lesson {
  id: number;
  teacher: Teacher;
  student: Student | null;
  group: Group | null;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;
  format: Format;
  subject: string;
  topic: string;
  status: LessonStatus;
  homeworkText: string;
  homeworkDone: boolean;
  isPaid: boolean;
  rateApplied: number;
  payoutAmount: number;

  constructor(
    id: number,
    teacher: Teacher,
    student: Student | null,
    group: Group | null,
    date: string,
    startTime: string,
    endTime: string,
    format: Format,
    subject: string,
    topic: string,
  ) {
    this.id = id;
    this.teacher = teacher;
    this.student = student;
    this.group = group;
    this.date = date;
    this.startTime = startTime;
    this.endTime = endTime;
    this.format = format;
    this.subject = subject;
    this.topic = topic;
    this.status = 'planned';
    this.homeworkText = '';
    this.homeworkDone = false;
    this.isPaid = false;
    this.rateApplied = 0;
    this.payoutAmount = 0;
  }

  durationMinutes(): number {
    return Math.max(15, toMinutes(this.endTime) - toMinutes(this.startTime));
  }

  isActive(): boolean {
    return this.status !== 'cancelled' && this.status !== 'rescheduled';
  }

  overlaps(other: Lesson): boolean {
    return this.date === other.date && this.startTime < other.endTime && other.startTime < this.endTime;
  }
}
