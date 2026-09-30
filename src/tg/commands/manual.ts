import type { Conversation } from "@grammyjs/conversations";
import type { AppContext } from "../types.js";
import { AppConfig } from "../../config.js";
import { omniaApiClient } from "../../api/omnia.js";
import { DateTime } from "luxon";
import { ScheduleModel } from "../../db/schedule.js";

export async function manualParseRunnerConv(
  conversation: Conversation<AppContext, AppContext>,
  ctx: AppContext,
) {
  if (ctx.from?.id.toString() === AppConfig.OwnerId!) {
    return;
  }

  await ctx.reply("Введи формат даты");
  const conv = await conversation.waitFor("message:text");

  const isValid = DateTime.fromFormat(ctx.message?.text!, AppConfig.TimeFormat);

  if (!isValid) {
    return await conv.reply("Невалидный формат <i>год-месяц-число</i>", {
      parse_mode: "HTML",
    });
  }

  const data = await omniaApiClient.fetchTable(conv.message?.text);

  if (!data) {
    return await conv.reply(`Не удалось зафетчить данные`);
  }

  await ScheduleModel.insertMany(data);

  return await conv.reply(`Успешно вставлено: ${data.length}`);
}

export async function manualParseRunnerCommand(ctx: AppContext) {
  await ctx.conversation.enter("manualParseRunnerConv");
}
