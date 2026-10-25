import {
  calculateLessonPayout,
  formatGroupReport,
  formatPayoutReport,
  formatStudentReport,
  freeWindows,
  groupStats,
  hasPendingHomework,
  inPeriod,
  isActive,
  overlappingPairs,
  payoutLines,
  resolvePeriod,
  studentStats,
  summarizePayout,
  isCountable,
} from './calc.ts';
import type { Rates } from './calc.ts';
import * as ops from './lessons.ts';
import { createLesson, Group, Student, Teacher } from './model.ts';
import type { Lesson, NewLesson } from './model.ts';

export type ActionResult = { ok: true; lesson: Lesson } | { ok: false; reason: string };

const ok = (lesson: Lesson): ActionResult => ({ ok: true, lesson });
const fail = (reason: string): ActionResult => ({ ok: false, reason });

/**
 * Школа: единственное место, где состояние заменяется. Данные внутри не меняются на месте:
 * каждое действие строит новый список занятий и присваивает его один раз.
 * Действия ничего не печатают, а возвращают результат; «сегодня» и ставки школы задаются при создании.
 */
export class School {
  readonly today: string; // YYYY-MM-DD
  readonly rates: Rates; // общие ставки школы
  teachers: readonly Teacher[] = [];
  students: readonly Student[] = [];
  groups: readonly Group[] = [];
  lessons: readonly Lesson[] = [];
  private nextId = 1;
  private nextLessonId = 1;

  constructor(today: string, rates: Rates = {}) {
    this.today = today;
    this.rates = Object.freeze({ ...rates });
  }

  addTeacher(name: string, rates: Rates = {}): Teacher {
    const teacher = new Teacher(this.nextId++, name, rates);
    this.teachers = [...this.teachers, teacher];
    return teacher;
  }

  addStudent(name: string): Student {
    const student = new Student(this.nextId++, name);
    this.students = [...this.students, student];
    return student;
  }

  addGroup(name: string, members: readonly Student[]): Group {
    const group = new Group(this.nextId++, name, members.map((m) => m.id));
    this.groups = [...this.groups, group];
    return group;
  }

  // ---- действия над занятиями ----

  scheduleLesson(req: NewLesson): ActionResult {
    const candidate = createLesson(this.nextLessonId, req);
    if (ops.findConflict(this.lessons, candidate)) {
      const name = this.teacher(req.teacherId).name;
      return fail(`Конфликт: у ${name} уже есть занятие ${req.date} ${req.startTime}-${req.endTime}`);
    }
    this.nextLessonId += 1;
    this.lessons = [...this.lessons, candidate];
    return ok(candidate);
  }

  rescheduleLesson(id: number, date: string, startTime: string, endTime: string): ActionResult {
    const moved = ops.reschedule(this.lesson(id), date, startTime, endTime);
    if (ops.findConflict(this.lessons, moved)) {
      return fail(`Конфликт: нельзя перенести урок ${id} на ${date} ${startTime}-${endTime}`);
    }
    return this.apply(moved);
  }

  cancelLesson(id: number): ActionResult {
    return this.change(id, ops.cancel);
  }

  conductLesson(id: number): ActionResult {
    return this.change(id, ops.conduct);
  }

  assignHomework(id: number, text: string): ActionResult {
    return this.change(id, (l) => ops.withHomework(l, text));
  }

  completeHomework(id: number): ActionResult {
    const lesson = this.lesson(id);
    if (lesson.homeworkText === '') return fail(`У урока ${id} нет домашнего задания`);
    return this.apply(ops.withHomeworkDone(lesson));
  }

  /** Отмечает проведённые занятия преподавателя за период выплаченными; возвращает сумму. */
  markPaid(teacherId: number, from: string, to: string): number {
    const teacher = this.teacher(teacherId);
    const target = this.lessons.filter(
      (l) => l.teacherId === teacherId && inPeriod(l.date, from, to) && isCountable(l.status) && !l.isPaid,
    );
    const paid = summarizePayout(payoutLines(target, teacher.rates, this.rates)).total;
    this.lessons = target.reduce((all, l) => ops.replaceLesson(all, ops.markPaid(l)), this.lessons);
    return paid;
  }

  // ---- запросы: только читают состояние ----

  /** Занятия преподавателя за период, суммы по правилам и готовый текст отчёта. */
  payout(teacherId: number, from?: string, to?: string) {
    const teacher = this.teacher(teacherId);
    const period = resolvePeriod(from, to, this.today);
    const inRange = this.lessons.filter((l) => l.teacherId === teacherId && inPeriod(l.date, period.from, period.to));
    const summary = summarizePayout(payoutLines(inRange, teacher.rates, this.rates));
    return { period, summary, report: formatPayoutReport(teacher.name, period, summary) };
  }

  /** Сумма выплаты за одно занятие по действующим ставкам. */
  lessonPayout(id: number): number {
    const lesson = this.lesson(id);
    return calculateLessonPayout(lesson, this.teacher(lesson.teacherId).rates, this.rates).amount;
  }

  findFreeWindows(teacherId: number, date: string, dayStart = '09:00', dayEnd = '21:00', minMinutes = 60): string[] {
    const busy = this.lessons.filter((l) => l.teacherId === teacherId && l.date === date && isActive(l.status));
    return freeWindows(busy, dayStart, dayEnd, minMinutes);
  }

  findConflicts(teacherId: number): Array<[Lesson, Lesson]> {
    return overlappingPairs(this.lessons.filter((l) => l.teacherId === teacherId && isActive(l.status)));
  }

  pendingHomework(studentId: number): Lesson[] {
    return this.lessons.filter((l) => l.studentId === studentId && hasPendingHomework(l));
  }

  studentReport(studentId: number): string {
    const student = this.students.find((s) => s.id === studentId);
    if (!student) throw new Error(`Нет ученика ${studentId}`);
    return formatStudentReport(student.name, studentStats(this.lessons.filter((l) => l.studentId === studentId)));
  }

  groupReport(groupId: number): string {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) throw new Error(`Нет группы ${groupId}`);
    return formatGroupReport(group.name, group.studentIds.length, groupStats(this.lessons.filter((l) => l.groupId === groupId)));
  }

  /** Сводка по школе за месяц. Ничего не печатает и не меняет. */
  summary(month: string): string {
    let total = 0;
    for (const t of this.teachers) total += this.payout(t.id, `${month}-01`, `${month}-31`).summary.total;
    const conducted = this.lessons.filter((l) => l.date.startsWith(month) && l.status === 'conducted').length;
    return `Школа за ${month}: проведено ${conducted}, к выплате ${total} ₽`;
  }

  // ---- внутреннее ----

  teacher(id: number): Teacher {
    const t = this.teachers.find((x) => x.id === id);
    if (!t) throw new Error(`Нет преподавателя ${id}`);
    return t;
  }

  lesson(id: number): Lesson {
    const l = this.lessons.find((x) => x.id === id);
    if (!l) throw new Error(`Нет занятия ${id}`);
    return l;
  }

  /** Единая точка записи: подменяет занятие в списке новой версией. */
  private apply(updated: Lesson): ActionResult {
    this.lessons = ops.replaceLesson(this.lessons, updated);
    return ok(updated);
  }

  /** Обобщение: любая правка занятия — это функция «было → стало». */
  private change(id: number, edit: (l: Lesson) => Lesson): ActionResult {
    return this.apply(edit(this.lesson(id)));
  }
}
