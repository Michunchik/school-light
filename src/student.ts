import { formatStudentReport, hasPendingHomework, studentStats } from './calc.ts';
import type { Lesson } from './lesson.ts';

export class Student {
  name: string;
  lessons: Lesson[];

  constructor(name: string) {
    this.name = name;
    this.lessons = [];
  }

  /** Уроки с выданным, но не сделанным ДЗ. */
  pendingHomework(): Lesson[] {
    return this.lessons.filter(hasPendingHomework);
  }

  completeHomework(lesson: Lesson): void {
    if (lesson.homeworkText === '') {
      console.log(`У урока ${lesson.id} нет домашнего задания`);
      return;
    }
    lesson.homeworkDone = true;
  }

  /** Печатает отчёт об ученике; текст собирает чистая функция. */
  printReport(): void {
    console.log(formatStudentReport(this.name, studentStats(this.lessons)));
  }
}
