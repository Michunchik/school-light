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
    return this.lessons.filter((l) => l.homeworkText !== '' && !l.homeworkDone && l.isActive());
  }

  completeHomework(lesson: Lesson): void {
    if (lesson.homeworkText === '') {
      console.log(`У урока ${lesson.id} нет домашнего задания`);
      return;
    }
    lesson.homeworkDone = true;
  }

  /** Печатает отчёт об ученике и ничего не возвращает. */
  printReport(): void {
    let conducted = 0;
    let cancelled = 0;
    let minutes = 0;
    for (const l of this.lessons) {
      if (l.status === 'conducted' || l.status === 'trial_conducted') {
        conducted += 1;
        minutes += l.durationMinutes();
      } else if (l.status === 'cancelled') {
        cancelled += 1;
      }
    }
    const pending = this.pendingHomework().length;
    console.log(`Отчёт: ${this.name}`);
    console.log(`  проведено занятий: ${conducted}, отменено: ${cancelled}, часов: ${Math.round((minutes / 60) * 10) / 10}`);
    console.log(`  ДЗ ждёт выполнения: ${pending}`);
  }
}
