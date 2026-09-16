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

  async function sendNotification(pairNumber: number, until: number) {
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

    const label = until == -1 ? "Пара начинается!" : `До пары осталось ${until} минут!`

    const text = `<blockquote>${label}</blockquote>\n<b>Предмет:</b> ${subjectName}\n<b>Время:</b> ${lesson.started_at}-${lesson.finished_at}\n<b>Ссылка:</b> <i>${url ? url : "Не выложена"}</i>\n<b>Напутствие:</b>\n<blockquote>${quote}</blockquote>`;

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

  const jobs: Array<[string, number, number]> = [
    // 1 пара (8:20 – 10:00)
    ["20 8  * * *", 1, 10],
    ["25 8  * * *", 1, 5],
    ["30 8  * * *", 1, -1],

    // 2 пара (10:00 – 11:30)
    ["50 9  * * *", 2, 10],
    ["55 9  * * *", 2, 5],
    ["0  10 * * *", 2, -1],

    // 3 пара (11:30 – 13:00)
    ["20 11 * * *", 3, 10],
    ["25 11 * * *", 3, 5],
    ["30 11 * * *", 3, -1],

    // 4 пара (13:30 – 15:00)
    ["20 13 * * *", 4, 10],
    ["25 13 * * *", 4, 5],
    ["30 13 * * *", 4, -1],

    // 5 пара (15:00 – 16:30)
    ["50 14 * * *", 5, 10],
    ["55 14 * * *", 5, 5],
    ["0  15 * * *", 5, -1],
  ];

  for (const [rule, pair, until] of jobs) {
    scheduleJob({ rule, tz: AppConfig.Tz }, () => sendNotification(pair, until));
  }
}
