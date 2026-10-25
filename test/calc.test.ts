import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateLessonPayout, freeWindows, resolvePeriod, resolveRate, summarizePayout } from '../src/calc.ts';

// Чистым функциям не нужны ни школа, ни преподаватель, ни ученик: данные передаются аргументами.

const lesson = (over: Partial<Parameters<typeof calculateLessonPayout>[0]> = {}) => ({
  status: 'conducted',
  format: 'individual',
  topic: 'Тема',
  startTime: '10:00',
  endTime: '11:00',
  ...over,
});

test('ставка: своя, потом школы, потом по умолчанию', () => {
  assert.equal(resolveRate('individual', { individual: 900 }, { individual: 700 }), 900);
  assert.equal(resolveRate('individual', {}, { individual: 700 }), 700);
  assert.equal(resolveRate('individual', {}, {}), 600);
});

test('выплата: полтора часа по 700', () => {
  assert.deepEqual(calculateLessonPayout(lesson({ endTime: '11:30' }), {}, { individual: 700 }), { rate: 700, amount: 1050 });
});

test('выплата: отменённое и перенесённое стоят ноль', () => {
  assert.equal(calculateLessonPayout(lesson({ status: 'cancelled' }), {}, {}).amount, 0);
  assert.equal(calculateLessonPayout(lesson({ status: 'rescheduled' }), {}, {}).amount, 0);
});

test('выплата: пробное по фиксированной ставке независимо от длительности', () => {
  assert.equal(calculateLessonPayout(lesson({ topic: 'Пробное занятие', endTime: '12:00' }), {}, {}).amount, 300);
});

test('период: по умолчанию с начала месяца до сегодня', () => {
  assert.deepEqual(resolvePeriod(undefined, undefined, '2026-10-26'), { from: '2026-10-01', to: '2026-10-26' });
  assert.deepEqual(resolvePeriod('2026-09-26', '2026-10-10', '2026-10-26'), { from: '2026-09-26', to: '2026-10-10' });
});

test('итоги: в сумму идут только проведённые, остаток считается отдельно', () => {
  const summary = summarizePayout([
    { status: 'conducted', payoutAmount: 700, isPaid: true },
    { status: 'trial_conducted', payoutAmount: 300, isPaid: false },
    { status: 'planned', payoutAmount: 700, isPaid: false },
    { status: 'cancelled', payoutAmount: 0, isPaid: false },
  ]);
  assert.deepEqual(summary, { total: 1000, unpaid: 300, count: 2 });
});

test('свободные окна: между занятиями и по краям дня', () => {
  const busy = [{ startTime: '12:00', endTime: '13:00' }];
  assert.deepEqual(freeWindows(busy, '09:00', '21:00', 60), ['09:00-12:00', '13:00-21:00']);
  assert.deepEqual(freeWindows(busy, '11:30', '13:30', 60), []);
});
