import type { AppContext } from "../types.js";
import { createScheduleMessage, scheduleMenu } from "./schedule.js";

export async function startCommand(ctx: AppContext) {
  await ctx.reply(await createScheduleMessage("None"), {
    parse_mode: "HTML",
    reply_markup: scheduleMenu,
  });
}