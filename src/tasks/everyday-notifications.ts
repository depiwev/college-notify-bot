import { scheduleJob } from "node-schedule";
import { ScheduleModel } from "../db/schedule.js";
import { tgBot } from "../tg/index.js";
import { AppConfig, PairTime, TextConfig } from "../config.js";
import { DateTime } from "../tools/datetime-now.js";
import { formatSubjectName } from "../tools/format-subject-name.js";
import { omniaApiClient } from "../api/omnia.js";
import Fuse from "fuse.js";
import { DateTime as DT } from "luxon";

const jobs: Array<[string, number, number]> = [
  // 1 пара (8:20 – 10:00)
  ["25 8  * * *", 1, 5],
  ["30 8  * * *", 1, -1],

  // 2 пара (9:00 – 11:30)
  ["55 9  * * *", 2, 5],
  ["0  10 * * *", 2, -1],

  // 3 пара (11:20 – 13:00)
  ["25 11 * * *", 3, 5],
  ["30 11 * * *", 3, -1],

  // 4 пара (13:20 – 15:00)
  ["25 13 * * *", 4, 5],
  ["30 13 * * *", 4, -1],

  // 5 пара (14:50 – 16:30)
  ["55 14 * * *", 5, 5],
  ["0  15 * * *", 5, -1],
];

export function startPairNotifications() {
  async function getTeamsUrl(
    subjectName: string,
    pairNumber: number,
  ): Promise<string | null> {
    const news = await omniaApiClient.fetchLastNews();

    if (!news?.length) return null;

    const fuse = new Fuse(
      news.map((item) => ({
        theme: item.theme.toLowerCase(),
        time: item.time,
        id_bbs: item.id_bbs,
      })),
      {
        keys: ["theme"],
        threshold: 0.4,
        ignoreLocation: true,
      },
    );

    const results = fuse.search(
      `${subjectName} ${PairTime[pairNumber - 1]}`,
    );

    const id = results
      .filter((result) =>
        DT.fromJSDate(new Date(result.item.time)).hasSame(DT.now(), "day"),
      )
      .map((result) => result.item)[0]?.id_bbs;

    if (!id) return null;

    const details = await omniaApiClient.fetchNewsDetails(id);

    if (!details) return null;

    return (
      details.text_bbs
        .match(/https:\/\/teams\.microsoft\.com\/[^\s<]+/)?.[0]
        ?.replace(/&amp;/g, "&") ?? null
    );
  }

  async function sendNotification(pairNumber: number, until: number) {
    const today = DateTime().toFormat(AppConfig.TimeFormat);
    const lesson = await ScheduleModel.findOne({
      lesson: pairNumber,
      date: today,
    });

    if (!lesson) return;

    const quotes = TextConfig.memes.quotes;
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    const subjectName = formatSubjectName(lesson.subject_name!);

    let url: string | null = null;
    try {
      url = await getTeamsUrl(subjectName!, pairNumber);
    } catch (error) {
      console.error("[PairNotifications] Не удалось получить ссылку Teams", {
        pairNumber,
        subjectName,
        error,
      });
    }

    if (url) {
      try {
        await ScheduleModel.updateOne(
          { _id: lesson._id },
          { teams_url: url },
        );
      } catch (error) {
        console.error("[PairNotifications] Не удалось сохранить ссылку Teams", {
          pairNumber,
          error,
        });
      }
    }

    const label =
      until === -1 ? "Пара начинается!" : `До пары осталось ${until} минут!`;
    const displayedUrl = url
      ? url.replaceAll('"', "").replace(/&/g, "&amp;")
      : "Не выложена";

    const text =
      `<blockquote>${label}</blockquote>\n` +
      `<b>Предмет:</b> ${subjectName}\n` +
      `<b>Время:</b> ${lesson.started_at}-${lesson.finished_at}\n` +
      `<b>Ссылка:</b> <i>${displayedUrl}</i>\n` +
      `<b>Напутствие:</b>\n<blockquote>${quote}</blockquote>`;

    const pairImages = TextConfig.memes.pairs;
    const image = pairImages[Math.floor(Math.random() * pairImages.length)] as
      | string
      | undefined;

    try {
      if (!image) throw new Error("Изображение для уведомления не задано");

      await tgBot.api.sendPhoto(AppConfig.NotificationChatId, image, {
        caption: text,
        parse_mode: "HTML",
      });
    } catch (error) {
      console.error(
        "[PairNotifications] Не удалось отправить фото, отправляем текст",
        error,
      );

      await tgBot.api
        .sendMessage(AppConfig.NotificationChatId, text, {
          parse_mode: "HTML",
        })
        .catch((sendError) => {
          console.error(
            "[PairNotifications] Не удалось отправить уведомление",
            sendError,
          );
          return null;
        });
    }
  }

  for (const [rule, pair, until] of jobs) {
    scheduleJob({ rule, tz: AppConfig.Tz }, () =>
      sendNotification(pair, until),
    );
  }
}
