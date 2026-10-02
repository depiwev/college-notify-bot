import { config } from "dotenv";

config();

function getEnv(name: string, default_?: string) {
  const v = process.env[name];
  if (!v && !default_) {
    throw new Error(`Нет переменной окружения: ${name}`);
  }
  return v!;
}

export const AppConfig = {
  AppEnv: getEnv("APP_ENV", "prod"),

  OwnerId: getEnv("OWNER_ID", "8530535278"),

  OmniaPassword: getEnv("OMNIA_PASSWORD"),
  OmniaUsername: getEnv("OMNIA_USERNAME"),
  OmniaAppKey: getEnv("OMNIA_APP_KEY"),

  TelegramToken: getEnv("TELEGRAM_TOKEN"),

  MongoUri:
    process.env.MONGODB_URI ?? "mongodb://localhost:27017/schedule-notifier",

  NotificationChatId: getEnv("TELEGRAM_CHAT_ID"),

  Tz: "Europe/Moscow",
  TimeFormat: "yyyy-MM-dd",
} as const;
