import { scheduleJob } from "node-schedule";
import { ScheduleModel, type ScheduleDocument } from "../db/schedule.js";
import { omniaApiClient } from "../api/omnia.js";
import { AppConfig } from "../config.js";

export function startTableFetch() {
  async function execute() {
    const lastTable = (await ScheduleModel.findOne(
      {},
      { sort: { created_at: -1 } },
    )) as any;

    const now = Date.now();

    if (!lastTable || now > new Date(lastTable.created_at).getTime()) {
      const tables = await omniaApiClient.fetchTable();

      if (!tables || tables.length === 0) {
        console.log("Не удалось получить расписание");
        return;
      }

      if (tables.length > 0) {
        await ScheduleModel.insertMany(
          tables.map((t) => ({ ...t, created_at: new Date(t.date) })),
        );
      }

      console.log("Расписание успешно актуализировано");
    }
  }

  scheduleJob(
    "table-fetch",
    { rule: "0 0 * * *", tz: AppConfig.Tz },
    execute,
  );
  execute();
}
