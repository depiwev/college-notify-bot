process.env.TZ = "Europe/Moscow";

import mongoose from "mongoose";
import cache from "ts-cache-mongoose";

import { AppConfig } from "./config.js";
import { startTableFetch } from "./tasks/table-fetch.js";
import { startBot } from "./tg/index.js";
import { startPairNotifications } from "./tasks/everyday-notifications.js";

import { config } from "dotenv";

config();

async function main() {
  cache.init(mongoose, {
    defaultTTL: "60 seconds",
    engine: "memory",
  });

  await mongoose
    .connect(AppConfig.MongoUri, {
      autoCreate: true,
      dbName: "scheduler-notify",
    })
    .then(() => console.log("MongoDb подключился"));

  startTableFetch();
  startPairNotifications();

  await startBot();
}

main();
