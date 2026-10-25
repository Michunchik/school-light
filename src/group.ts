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

  /** Печатает сводку по группе: сколько занятий проведено и сколько ДЗ сделано. */
  printReport(): void {
    let conducted = 0;
    let withHomework = 0;
    let homeworkDone = 0;
    for (const l of this.lessons) {
      if (l.status === 'conducted') conducted += 1;
      if (l.homeworkText !== '' && l.isActive()) {
        withHomework += 1;
        if (l.homeworkDone) homeworkDone += 1;
      }
    }
    console.log(`Группа «${this.name}»: учеников ${this.students.length}`);
    console.log(`  проведено занятий: ${conducted}, ДЗ выдано: ${withHomework}, сделано: ${homeworkDone}`);
  }
}
