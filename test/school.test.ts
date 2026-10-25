import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLesson } from '../src/model.ts';
import * as ops from '../src/lessons.ts';
import { School } from '../src/school.ts';
import type { ActionResult } from '../src/school.ts';

function setup() {
  const school = new School('2026-10-26', { individual: 700 });
  const teacher = school.addTeacher('Анна');
  const student = school.addStudent('Вера');
  const lesson = (date: string, startTime: string, endTime: string, topic = 'Тема', format: 'individual' | 'group' = 'individual') =>
    school.scheduleLesson({ teacherId: teacher.id, studentId: student.id, date, startTime, endTime, format, subject: 'Математика', topic });
  return { school, teacher, student, lesson };
}

const id = (r: ActionResult): number => {
  assert.ok(r.ok);
  return r.lesson.id;
};

test('зарплата: полтора часа по ставке школы', () => {
  const { school, lesson } = setup();
  const l = id(lesson('2026-10-20', '10:00', '11:30'));
  school.conductLesson(l);
  assert.equal(school.lessonPayout(l), 1050);
});

test('своя ставка преподавателя важнее ставки школы', () => {
  const school = new School('2026-10-26', { individual: 700 });
  const teacher = school.addTeacher('Олег', { individual: 900 });
  const student = school.addStudent('Вера');
  const r = school.scheduleLesson({ teacherId: teacher.id, studentId: student.id, date: '2026-10-20', startTime: '10:00', endTime: '11:00', format: 'individual', subject: 'Физика' });
  assert.equal(school.lessonPayout(id(r)), 900);
});

test('пробное занятие оплачивается фиксированно', () => {
  const { school, lesson } = setup();
  assert.equal(school.lessonPayout(id(lesson('2026-10-20', '10:00', '12:00', 'Пробное занятие'))), 300);
});

test('пересекающееся занятие не назначается и состояние не меняется', () => {
  const { school, lesson } = setup();
  lesson('2026-10-20', '10:00', '11:00');
  const before = school.lessons;
  const second = lesson('2026-10-20', '10:30', '11:30');
  assert.equal(second.ok, false);
  assert.equal(school.lessons, before);
});

test('отменённое занятие не попадает в зарплату', () => {
  const { school, teacher, lesson } = setup();
  school.cancelLesson(id(lesson('2026-10-20', '10:00', '11:00')));
  assert.equal(school.payout(teacher.id, '2026-10-01', '2026-10-31').summary.total, 0);
});

test('markPaid переводит остаток из «не выплачено» в «выплачено»', () => {
  const { school, teacher, lesson } = setup();
  school.conductLesson(id(lesson('2026-10-20', '10:00', '11:00')));
  assert.equal(school.payout(teacher.id, '2026-10-01', '2026-10-31').summary.unpaid, 700);
  assert.equal(school.markPaid(teacher.id, '2026-10-01', '2026-10-31'), 700);
  assert.equal(school.payout(teacher.id, '2026-10-01', '2026-10-31').summary.unpaid, 0);
});

test('свободные окна учитывают занятия', () => {
  const { school, teacher, lesson } = setup();
  lesson('2026-10-20', '12:00', '13:00');
  assert.deepEqual(school.findFreeWindows(teacher.id, '2026-10-20'), ['09:00-12:00', '13:00-21:00']);
});

test('домашнее задание: выдача и выполнение', () => {
  const { school, student, lesson } = setup();
  const l = id(lesson('2026-10-20', '10:00', '11:00'));
  school.assignHomework(l, 'Задачи 1-5');
  assert.equal(school.pendingHomework(student.id).length, 1);
  school.completeHomework(l);
  assert.equal(school.pendingHomework(student.id).length, 0);
});

test('ДЗ без задания выполнить нельзя', () => {
  const { school, lesson } = setup();
  assert.equal(school.completeHomework(id(lesson('2026-10-20', '10:00', '11:00'))).ok, false);
});

// ---- copy-on-write ----

test('перенос создаёт новое занятие, старое остаётся прежним', () => {
  const original = createLesson(1, { teacherId: 1, studentId: 2, date: '2026-10-20', startTime: '10:00', endTime: '11:00', format: 'individual', subject: 'Математика' });
  const moved = ops.reschedule(original, '2026-10-21', '12:00', '13:00');
  assert.notEqual(moved, original);
  assert.equal(original.date, '2026-10-20');
  assert.equal(moved.date, '2026-10-21');
  assert.equal(moved.id, original.id);
});

test('занятие заморожено: прямая запись в поле даёт ошибку', () => {
  const lesson = createLesson(1, { teacherId: 1, studentId: 2, date: '2026-10-20', startTime: '10:00', endTime: '11:00', format: 'individual', subject: 'Математика' });
  assert.throws(() => {
    (lesson as { status: string }).status = 'conducted';
  }, TypeError);
});

test('действие заменяет список, а не меняет его на месте', () => {
  const { school, lesson } = setup();
  const l = id(lesson('2026-10-20', '10:00', '11:00'));
  const before = school.lessons;
  const oldVersion = school.lesson(l);
  school.conductLesson(l);
  assert.notEqual(school.lessons, before);
  assert.equal(before[0].status, 'planned');
  assert.equal(oldVersion.status, 'planned');
  assert.equal(school.lesson(l).status, 'conducted');
});
