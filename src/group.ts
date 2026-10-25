import { formatGroupReport, groupStats } from './calc.ts';
import type { Lesson } from './lesson.ts';
import type { Student } from './student.ts';

export class Group {
  name: string;
  students: Student[];
  lessons: Lesson[];

  constructor(name: string) {
    this.name = name;
    this.students = [];
    this.lessons = [];
  }

  addStudent(student: Student): void {
    if (this.students.includes(student)) return;
    this.students.push(student);
  }

  /** Печатает сводку по группе; текст собирает чистая функция. */
  printReport(): void {
    console.log(formatGroupReport(this.name, this.students.length, groupStats(this.lessons)));
  }
}
