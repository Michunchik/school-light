import { School } from './school.ts';

const school = new School('2026-10-26');
school.rates = { individual: 700 };

const anna = school.addTeacher('Анна Петрова');
const oleg = school.addTeacher('Олег Сидоров');
oleg.rates = { individual: 900 };

const vera = school.addStudent('Вера Захлестных');
const max = school.addStudent('Максим Иванов');
const lena = school.addStudent('Лена Орлова');
const oge = school.addGroup('ОГЭ-математика', [vera, max]);

console.log('--- Расписание ---');
const l1 = anna.scheduleLesson(vera, '2026-10-20', '10:00', '11:00', 'individual', 'Математика', 'Квадратные уравнения');
const l2 = anna.scheduleLesson(max, '2026-10-21', '12:00', '13:30', 'individual', 'Математика', 'Пробное занятие');
const l3 = anna.scheduleLesson(oge, '2026-10-22', '17:00', '18:30', 'group', 'Математика', 'Разбор варианта');
anna.scheduleLesson(lena, '2026-10-22', '18:00', '19:00', 'individual', 'Математика', 'Функции'); // конфликт
const l4 = oleg.scheduleLesson(lena, '2026-10-23', '15:00', '16:00', 'individual', 'Физика', 'Кинематика');
const l5 = oleg.scheduleLesson(vera, '2026-10-27', '15:00', '16:00', 'individual', 'Физика', 'Динамика');

console.log('--- Перенос и отмена ---');
anna.rescheduleLesson(l3!, '2026-10-22', '17:30', '19:00');
oleg.cancelLesson(l5!);

console.log('--- Проведение и ДЗ ---');
anna.conductLesson(l1!);
anna.assignHomework(l1!, 'Задачи 1-10');
vera.completeHomework(l1!);
anna.conductLesson(l2!);
anna.conductLesson(l3!);
anna.assignHomework(l3!, 'Вариант 7, часть 1');
oleg.conductLesson(l4!);
oleg.assignHomework(l4!, 'Задачи на скорость');

console.log('--- Окна ---');
console.log('Анна 22 октября:', anna.findFreeWindows('2026-10-22'));
console.log('Конфликтов у Анны:', anna.findConflicts().length);

console.log('--- Зарплата ---');
anna.calculatePayout('2026-10-01', '2026-10-31');
console.log('Выплачено Анне:', anna.markPaid('2026-10-01', '2026-10-21'), '₽');
anna.calculatePayout('2026-10-01', '2026-10-31');
oleg.calculatePayout();

console.log('--- Отчёты ---');
vera.printReport();
lena.printReport();
oge.printReport();
school.printSummary('2026-10');
