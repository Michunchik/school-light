import { Group } from './group.ts';
import type { Lesson } from './lesson.ts';
import { Student } from './student.ts';
import { Teacher } from './teacher.ts';

/** Школа: всё хранится в памяти, базы нет. */
export class School {
  teachers: Teacher[];
  students: Student[];
  groups: Group[];
  lessons: Lesson[];
  rates: Record<string, number>; // общие ставки школы
  nextLessonId: number;
  today: string; // «сегодня», YYYY-MM-DD

  constructor(today: string) {
    this.teachers = [];
    this.students = [];
    this.groups = [];
    this.lessons = [];
    this.rates = {};
    this.nextLessonId = 1;
    this.today = today;
  }

  addTeacher(name: string): Teacher {
    const t = new Teacher(name, this);
    this.teachers.push(t);
    return t;
  }

  addStudent(name: string): Student {
    const s = new Student(name);
    this.students.push(s);
    return s;
  }

  addGroup(name: string, members: Student[]): Group {
    const g = new Group(name);
    for (const m of members) g.addStudent(m);
    this.groups.push(g);
    return g;
  }

  /** Сводка по школе за месяц: сколько занятий и сколько надо выплатить учителям. */
  printSummary(month: string): void {
    let total = 0;
    let lessons = 0;
    for (const t of this.teachers) {
      total += t.calculatePayout(`${month}-01`, `${month}-31`);
      lessons += t.lessons.filter((l) => l.date.startsWith(month) && l.status === 'conducted').length;
    }
    console.log(`Школа за ${month}: проведено ${lessons}, к выплате ${total} ₽`);
  }
}
