import { AppConfig } from "../../config.js";
import { ScheduleModel } from "../../db/schedule.js";
import { formatSubjectName } from "../../tools/format-subject-name.js";
import { formatWeekDay } from "../../tools/format-week-day.js";
import { DateTime } from "../../tools/datetime-now.js";
import type { AppContext } from "../types.js";
import { Menu } from "@grammyjs/menu";

export async function createScheduleMessage(
  scope: "None" | "Yesterday" | "Today" | "Tommorow",
) {
  const [yesterday, today, tommorow] = [
    DateTime().minus({ day: 1 }),
    DateTime(),
    DateTime().plus({ day: 1 }),
  ];

  const table = await ScheduleModel.find({
    date: {
      $in: [
        yesterday.toFormat(AppConfig.TimeFormat),
        today.toFormat(AppConfig.TimeFormat),
        tommorow.toFormat(AppConfig.TimeFormat),
      ],
    },
  })
    .sort({ lesson: -1 })
    .cache("600 seconds");

  const now = DateTime();

  const [yesterdayA, todayA, tommorowA] = [
    table.filter((t) => t.date === yesterday.toFormat(AppConfig.TimeFormat)),
    table.filter((t) => t.date === today.toFormat(AppConfig.TimeFormat)),
    table.filter((t) => t.date === tommorow.toFormat(AppConfig.TimeFormat)),
  ];

  const lastToday = todayA[todayA.length - 1];
  const isLastPairEnded = lastToday
    ? (() => {
        const [lastHour, lastMinute] = lastToday
          .finished_at!.split(":")
          .map(Number);
        return (
          now.hour > lastHour! ||
          (now.hour === lastHour && now.minute > lastMinute!)
        );
      })()
    : true;

  let scheduleA = todayA;
  let scheduleLabel = "Сегодня";
  let scheduleDate = today;

  switch (scope) {
    case "Yesterday":
      scheduleA = yesterdayA;
      scheduleLabel = "Вчера";
      scheduleDate = yesterday;
      break;
    case "None":
    case "Today":
      scheduleA = todayA;
      scheduleLabel = "Сегодня";
      scheduleDate = today;
      break;
    case "Tommorow":
      scheduleA = tommorowA;
      scheduleLabel = "Завтра";
      scheduleDate = tommorow;
      break;
  }

  if (scope === "None" && (todayA.length === 0 || isLastPairEnded)) {
    scheduleA = tommorowA;
    scheduleLabel = "Завтра";
    scheduleDate = tommorow;
  }

  const schedule = scheduleA.length
    ? scheduleA
        .sort((a, b) => a.lesson! - b.lesson!)
        .map(
          (t, i) =>
            `${i + 1}) ${formatSubjectName(t.subject_name!)}\n<b>Время: </b>${t.started_at}-${t.finished_at}\n<b>Преподаватель:</b> ${t.teacher_name}`,
        )
        .join("\n\n")
    : "Нет пар";

  return `<blockquote>Расписание на ${scheduleLabel.toLowerCase()}</blockquote>\n<b>День недели — ${formatWeekDay(scheduleDate.localWeekday)}!</b>\n\n<strong>Предметы:</strong>\n${schedule}`;
}

export const scheduleMenuId = "schedule-menu";
export const scheduleMenu = new Menu<AppContext>(scheduleMenuId, {
  onMenuOutdated: async (ctx) => {
    await ctx.editMessageText(ctx.msg!.text!).catch(() => null);
  },
})
  .text("Вчера", (ctx) => scheduleMenuCb(ctx, "Yesterday"))
  .text("Сегодня", (ctx) => scheduleMenuCb(ctx, "Today"))
  .text("Завтра", (ctx) => scheduleMenuCb(ctx, "Tommorow"));

async function scheduleMenuCb(
  ctx: AppContext,
  scope: "None" | "Yesterday" | "Today" | "Tommorow",
) {
  await ctx
    .editMessageText(await createScheduleMessage(scope), {
      parse_mode: "HTML",
      reply_markup: scheduleMenu,
    })
    .catch(() => null);
}

export async function scheduleCommand(ctx: AppContext) {
  if (ctx.chatId?.toString() != AppConfig.NotificationChatId) {
    return;
  }

  await ctx.reply(await createScheduleMessage("None"), {
    parse_mode: "HTML",
    reply_markup: scheduleMenu,
  });
}
