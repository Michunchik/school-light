import type { ActionResult } from './school.ts';
import { School } from './school.ts';

/** Печать — забота вызывающего кода: школа только возвращает результат. */
const show = (r: ActionResult): ActionResult => {
  if (!r.ok) console.log(r.reason);
  return r;
};
const idOf = (r: ActionResult): number => {
  if (!r.ok) throw new Error(r.reason);
  return r.lesson.id;
};

const school = new School('2026-10-26', { individual: 700 });

const anna = school.addTeacher('Анна Петрова');
const oleg = school.addTeacher('Олег Сидоров', { individual: 900 });

const vera = school.addStudent('Вера Захлестных');
const max = school.addStudent('Максим Иванов');
const lena = school.addStudent('Лена Орлова');
const oge = school.addGroup('ОГЭ-математика', [vera, max]);

console.log('--- Расписание ---');
const l1 = idOf(show(school.scheduleLesson({ teacherId: anna.id, studentId: vera.id, date: '2026-10-20', startTime: '10:00', endTime: '11:00', format: 'individual', subject: 'Математика', topic: 'Квадратные уравнения' })));
const l2 = idOf(show(school.scheduleLesson({ teacherId: anna.id, studentId: max.id, date: '2026-10-21', startTime: '12:00', endTime: '13:30', format: 'individual', subject: 'Математика', topic: 'Пробное занятие' })));
const l3 = idOf(show(school.scheduleLesson({ teacherId: anna.id, groupId: oge.id, date: '2026-10-22', startTime: '17:00', endTime: '18:30', format: 'group', subject: 'Математика', topic: 'Разбор варианта' })));
show(school.scheduleLesson({ teacherId: anna.id, studentId: lena.id, date: '2026-10-22', startTime: '18:00', endTime: '19:00', format: 'individual', subject: 'Математика', topic: 'Функции' })); // конфликт
const l4 = idOf(show(school.scheduleLesson({ teacherId: oleg.id, studentId: lena.id, date: '2026-10-23', startTime: '15:00', endTime: '16:00', format: 'individual', subject: 'Физика', topic: 'Кинематика' })));
const l5 = idOf(show(school.scheduleLesson({ teacherId: oleg.id, studentId: vera.id, date: '2026-10-27', startTime: '15:00', endTime: '16:00', format: 'individual', subject: 'Физика', topic: 'Динамика' })));

console.log('--- Перенос и отмена ---');
show(school.rescheduleLesson(l3, '2026-10-22', '17:30', '19:00'));
show(school.cancelLesson(l5));

console.log('--- Проведение и ДЗ ---');
const conduct = (id: number) => {
  show(school.conductLesson(id));
  console.log(`Урок ${id} проведён, к выплате ${school.lessonPayout(id)} ₽`);
};
conduct(l1);
school.assignHomework(l1, 'Задачи 1-10');
show(school.completeHomework(l1));
conduct(l2);
conduct(l3);
school.assignHomework(l3, 'Вариант 7, часть 1');
conduct(l4);
school.assignHomework(l4, 'Задачи на скорость');

console.log('--- Окна ---');
console.log('Анна 22 октября:', school.findFreeWindows(anna.id, '2026-10-22'));
console.log('Конфликтов у Анны:', school.findConflicts(anna.id).length);

console.log('--- Зарплата ---');
console.log(school.payout(anna.id, '2026-10-01', '2026-10-31').report);
console.log('Выплачено Анне:', school.markPaid(anna.id, '2026-10-01', '2026-10-21'), '₽');
console.log(school.payout(anna.id, '2026-10-01', '2026-10-31').report);
console.log(school.payout(oleg.id).report);

console.log('--- Отчёты ---');
console.log(school.studentReport(vera.id));
console.log(school.studentReport(lena.id));
console.log(school.groupReport(oge.id));
console.log(school.summary('2026-10'));
