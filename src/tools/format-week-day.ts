export const weekDays = [
  "Воскресенье", // 0
  "Понедельник", // 1
  "Вторник", // 2
  "Среда", // 3
  "Четверг", // 4
  "Пятница", // 5
  "Суббота", // 6
] as const;

export function formatWeekDay(day: number) {
  return weekDays[day];
}
