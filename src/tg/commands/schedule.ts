import { AppConfig } from "../../config.js";
import { ScheduleModel } from "../../db/schedule.js";
import { formatSubjectName } from "../../tools/format-subject-name.js";
import { DateTime } from "../../tools/datetime-now.js";
import type { AppContext } from "../types.js";
import { Menu, MenuRange } from "@grammyjs/menu";
import type { DateTime as DateTimeType } from "luxon";

type Scope =
  | "Yesterday"
  | "Today"
  | "Tommorow"
  | "Week"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export async function createScheduleMessage(scope: Scope): Promise<string> {
  const now = DateTime();
  const weekDay = now.weekday;

  const mondayDate =
    weekDay == 1 ? now : now.minus({ days: Math.abs(1 - weekDay) });

  const dateRange: DateTimeType[] = new Array(7).fill(1).map((_, i) => {
    if (i == 0) {
      return mondayDate;
    }

    return mondayDate.plus({ days: i });
  });

  const weekSchedule = await ScheduleModel.find({
    date: { $in: dateRange.map((d) => d.toFormat(AppConfig.TimeFormat)) },
  }).sort({ lesson: -1 });

  const dateMap: Record<string, (typeof weekSchedule)[number][]> = {};

  for (const schedule of weekSchedule) {
    const existed = dateMap[schedule.date!];

    if (existed) {
      dateMap[schedule.date!] = [...existed, schedule];
    } else {
      dateMap[schedule.date!] = [schedule];
    }
  }

  function createMessageTable() {
    let message: string = "";

    function createSubject(
      schedule: (typeof weekSchedule)[number],
      idx: number,
    ) {
      return [
        `<b>${idx + 1})</b> ${formatSubjectName(schedule.subject_name!)}`,
        `<b>Время: </b>${schedule.started_at}-${schedule.finished_at}`,
        `<b>Преподаватель:</b> ${schedule.teacher_name}`,
      ].join("\n");
    }

    function createSchedule(date: DateTimeType) {
      const value = dateMap[date.toFormat(AppConfig.TimeFormat)];
      const body = !value ? "Нет пар" : value.map(createSubject).join("\n\n");

      let header = "Расписание на сегодня";

      switch (scope) {
        case "Monday":
          header = "Расписание на понедельник";
          break;
        case "Tuesday":
          header = "Расписание на вторник";
          break;
        case "Wednesday":
          header = "Расписание на среду";
          break;
        case "Thursday":
          header = "Расписание на четверг";
          break;
        case "Friday":
          header = "Расписание на пятницу";
          break;
        case "Saturday":
          header = "Расписание на субботу";
          break;
        case "Yesterday":
          header = "Расписание на вчера";
          break;
        case "Today":
          header = "Расписание на сегодня";
          break;
        case "Tommorow":
          header = "Расписание на завтра";
          break;
      }

      return [`<blockquote>${header}</blockquote>`, body].join("\n\n");
    }
    if (scope === "Monday") {
      message = createSchedule(dateRange[0]!);
    }

    if (scope === "Tuesday") {
      message = createSchedule(dateRange[1]!);
    }

    if (scope === "Wednesday") {
      message = createSchedule(dateRange[2]!);
    }

    if (scope === "Thursday") {
      message = createSchedule(dateRange[3]!);
    }

    if (scope === "Friday") {
      message = createSchedule(dateRange[4]!);
    }

    if (scope === "Saturday") {
      message = createSchedule(dateRange[5]!);
    }

    if (scope === "Yesterday") {
      message = createSchedule(now.minus({ days: 1 }));
    }

    if (scope === "Today") {
      message = createSchedule(now);
    }

    if (scope === "Tommorow") {
      message = createSchedule(now.plus({ days: 1 }));
    }

    return message;
  }

  return createMessageTable();
}

export const scheduleMenuId = "schedule-menu";
export const scheduleMenu = new Menu<AppContext>(scheduleMenuId, {
  onMenuOutdated: async (ctx) => {
    await ctx.editMessageText(ctx.msg!.text!).catch(() => null);
  },
}).dynamic(() => {
  const now = DateTime();
  const weekDay = now.weekday;

  const range = new MenuRange<AppContext>();

  if (weekDay - 1 > 0) {
    range.text("Вчера", (ctx) => scheduleMenuCb(ctx, "Yesterday"));
  }

  range.text("Сегодня", (ctx) => scheduleMenuCb(ctx, "Today"));

  if (weekDay + 1 <= 6) {
    range.text("Завтра", (ctx) => scheduleMenuCb(ctx, "Tommorow"));
  }

  range.row();

  return range
    .text("Понедельник", (ctx) => scheduleMenuCb(ctx, "Monday"))
    .text("Вторник", (ctx) => scheduleMenuCb(ctx, "Tuesday"))
    .text("Среда", (ctx) => scheduleMenuCb(ctx, "Wednesday"))
    .row()
    .text("Четверг", (ctx) => scheduleMenuCb(ctx, "Thursday"))
    .text("Пятница", (ctx) => scheduleMenuCb(ctx, "Friday"))
    .text("Суббота", (ctx) => scheduleMenuCb(ctx, "Saturday"));
});

async function scheduleMenuCb(ctx: AppContext, scope: Scope) {
  await ctx
    .editMessageText(await createScheduleMessage(scope), {
      parse_mode: "HTML",
      reply_markup: scheduleMenu,
    })
    .catch(() => null);
}

export async function scheduleCommand(ctx: AppContext) {
  await ctx
    .reply(await createScheduleMessage("Today"), {
      parse_mode: "HTML",
      reply_markup: scheduleMenu,
    })
    .catch(() => null);
}
