import { AppConfig } from "../../config.js";
import { ScheduleModel } from "../../db/schedule.js";
import { formatSubjectName } from "../../tools/format-subject-name.js";
import { formatDateString } from "../../tools/format-date-string.js";
import { formatWeekDay } from "../../tools/format-week-day.js";
import type { AppContext } from "../index.js";
import { DateTime } from "../../tools/datetime-now.js";


// -1 = вчера
// 0 = сегодня
// 1 = завтра
// TODO: сделать штуку, которая понимает, что пары закончились
async function execute(ctx: AppContext, shift: -1 | 0 | 1) {
  if (ctx.chatId?.toString() != AppConfig.NotificationChatId) {
    return;
  }

  const thisDay = formatDateString(DateTime().plus({ day: shift }).toJSDate());

  const table = await ScheduleModel.find({
    date: thisDay,
  });

  const schedule = table.length
    ? table
        .sort((a, b) => a.lesson! - b.lesson!)
        .map(
          (t, i) =>
            `${i + 1}) ${formatSubjectName(t.subject_name!)}\n<b>Время: </b>${t.started_at}-${t.finished_at}\n<b>Преподаватель:</b> ${t.teacher_name}`,
        )
        .join("\n\n")
    : "Нет пар";

  await ctx.reply(
    `<blockquote>Расписание на сегодня</blockquote>\n<b>Сегодня — ${formatWeekDay(new Date())}!</b>\n\n<strong>Расписание:</strong>\n${schedule}`,
    {
      parse_mode: "HTML",
    },
  );
}

export async function scheduleCommand(ctx: AppContext) {
  execute(ctx, 0)
}
