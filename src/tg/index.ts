import { CommandGroup, type CommandsFlavor } from "@grammyjs/commands";
import { Bot, type Context } from "grammy";
import { scheduleCommand } from "./commands/schedule.js";
import { AppConfig } from "../config.js";

export type AppContext = CommandsFlavor<Context>;

export const tgBot = new Bot<AppContext>(AppConfig.TelegramToken);

export async function startBot() {
  const commands = new CommandGroup<AppContext>();

  commands.command("schedule", "Расписание пар", scheduleCommand);

  tgBot.use(commands);

  await commands.setCommands(tgBot);

  await tgBot.start({
    onStart: (botInfo) => {
      console.log(`Бот @${botInfo.username} запущен`);
    },
  });
}
