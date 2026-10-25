import assert from 'node:assert/strict';
import { test } from 'node:test';
import { School } from '../src/school.ts';

function setup() {
  const school = new School('2026-10-26');
  school.rates = { individual: 700 };
  const teacher = school.addTeacher('Анна');
  const student = school.addStudent('Вера');
  return { school, teacher, student };
}

test('зарплата: час индивидуального по ставке школы', () => {
  const { teacher, student } = setup();
  const lesson = teacher.scheduleLesson(student, '2026-10-20', '10:00', '11:30', 'individual', 'Математика', 'Тема')!;
  teacher.conductLesson(lesson);
  assert.equal(lesson.payoutAmount, 1050);
});

test('своя ставка преподавателя важнее ставки школы', () => {
  const { teacher, student } = setup();
  teacher.rates = { individual: 900 };
  const lesson = teacher.scheduleLesson(student, '2026-10-20', '10:00', '11:00', 'individual', 'Математика', 'Тема')!;
  teacher.conductLesson(lesson);
  assert.equal(lesson.payoutAmount, 900);
});

test('пробное занятие оплачивается фиксированно', () => {
  const { teacher, student } = setup();
  const lesson = teacher.scheduleLesson(student, '2026-10-20', '10:00', '12:00', 'individual', 'Математика', 'Пробное занятие')!;
  teacher.conductLesson(lesson);
  assert.equal(lesson.payoutAmount, 300);
});

test('пересекающееся занятие не назначается', () => {
  const { teacher, student } = setup();
  teacher.scheduleLesson(student, '2026-10-20', '10:00', '11:00', 'individual', 'Математика', 'А');
  const second = teacher.scheduleLesson(student, '2026-10-20', '10:30', '11:30', 'individual', 'Математика', 'Б');
  assert.equal(second, null);
});

test('отменённое занятие не попадает в зарплату', () => {
  const { teacher, student } = setup();
  const lesson = teacher.scheduleLesson(student, '2026-10-20', '10:00', '11:00', 'individual', 'Математика', 'Тема')!;
  teacher.cancelLesson(lesson);
  assert.equal(teacher.calculatePayout('2026-10-01', '2026-10-31'), 0);
});

test('markPaid уменьшает остаток к выплате', () => {
  const { teacher, student } = setup();
  const lesson = teacher.scheduleLesson(student, '2026-10-20', '10:00', '11:00', 'individual', 'Математика', 'Тема')!;
  teacher.conductLesson(lesson);
  teacher.calculatePayout('2026-10-01', '2026-10-31');
  assert.equal(teacher.balanceDue, 700);
  teacher.markPaid('2026-10-01', '2026-10-31');
  assert.equal(teacher.balanceDue, 0);
});

test('свободные окна учитывают занятия', () => {
  const { teacher, student } = setup();
  teacher.scheduleLesson(student, '2026-10-20', '12:00', '13:00', 'individual', 'Математика', 'Тема');
  assert.deepEqual(teacher.findFreeWindows('2026-10-20'), ['09:00-12:00', '13:00-21:00']);
});

test('домашнее задание: выдача и выполнение', () => {
  const { teacher, student } = setup();
  const lesson = teacher.scheduleLesson(student, '2026-10-20', '10:00', '11:00', 'individual', 'Математика', 'Тема')!;
  teacher.assignHomework(lesson, 'Задачи 1-5');
  assert.equal(student.pendingHomework().length, 1);
  student.completeHomework(lesson);
  assert.equal(student.pendingHomework().length, 0);
});
