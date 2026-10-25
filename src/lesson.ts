import { durationMinutes, isActive, overlaps } from './calc.ts';
import type { Group } from './group.ts';
import type { Student } from './student.ts';
import type { Teacher } from './teacher.ts';

export type LessonStatus = 'planned' | 'conducted' | 'trial_conducted' | 'cancelled' | 'rescheduled';
export type Format = 'individual' | 'group' | 'intensive' | 'curatorship' | 'trial';

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
    return durationMinutes(this.startTime, this.endTime);
  }

  isActive(): boolean {
    return isActive(this.status);
  }

  overlaps(other: Lesson): boolean {
    return overlaps(this, other);
  }
}
