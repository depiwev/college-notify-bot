import { scheduleJob } from "node-schedule";
import { ScheduleModel } from "../db/schedule.js";
import { tgBot } from "../tg/index.js";
import { AppConfig, TextConfig } from "../config.js";
import { formatDateString } from "../tools/format-date-string.js";
import { DateTime } from "../tools/datetime-now.js";
import { omniaApiClient } from "../api/omnia.js";
import { formatSubjectName } from "../tools/format-subject-name.js";
import { normalize } from "../tools/padegi-tools.js";

export function startEverydayNotification() {
  scheduleJob("everyday-notifications", async () => {});
}

export function startPairNotifications() {
  async function getTeamsUrl(subjectName: string): Promise<string | null> {
    const news = (await omniaApiClient.fetchLastNews()) ?? [];

    const query = normalize(subjectName);
    const post = news.find((n) => normalize(n.theme).includes(query));

    if (!post) {
      return null;
    }

    const details = await omniaApiClient.fetchNewsDetails(post?.id_bbs);

    if (!details) {
      return null;
    }

    const url =
      details.text_bbs
        .match(/https:\/\/teams\.microsoft\.com\/[^\s<]+/)?.[0]
        ?.replace(/&amp;/g, "&") ?? null;

    return url ?? null;
  }

  async function sendNotification(pairNumber: number) {
    const today = formatDateString(DateTime().toJSDate());

    const lesson = await ScheduleModel.findOne({
      lesson: pairNumber,
      date: today,
    });

    if (!lesson) {
      return;
    }

    const quote =
      TextConfig.memes.quotes[
        Math.round(Math.random() * TextConfig.memes.quotes.length)
      ];

    const subjectName = formatSubjectName(lesson.subject_name!);

    const url = await getTeamsUrl(subjectName!);

    const text = `<blockquote>Внимание, пара!</blockquote>\n<b>Предмет:</b> ${subjectName}\n<b>Время:</b> ${lesson.started_at}-${lesson.finished_at}\n<b>Ссылка:</b> <i>${url ? url : "Не выложена"}</i>\n<b>Напутствие:</b>\n<blockquote>${quote}</blockquote>`;

    try {
      await tgBot.api.sendPhoto(
        AppConfig.NotificationChatId,
        TextConfig.memes.pairs[
          Math.round(Math.random() * TextConfig.memes.pairs.length)
        ] as string,
        { caption: text, parse_mode: "HTML" },
      );
    } catch {
      await tgBot.api
        .sendMessage(AppConfig.NotificationChatId, text, {
          parse_mode: "HTML",
        })
        .catch(() => null);
    }
  }

  const jobs: Array<[string, number]> = [
    ["30 8  * * *", 1],
    ["0  10 * * *", 2],
    ["30 11 * * *", 3],
    ["30 13 * * *", 4],
    ["0  15 * * *", 5],
  ];

  for (const [rule, pair] of jobs) {
    scheduleJob({ rule, tz: AppConfig.Tz }, () => sendNotification(pair));
  }
}
