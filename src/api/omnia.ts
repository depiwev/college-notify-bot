import { AppConfig } from "../config.js";
import { DateTime } from "../tools/datetime-now.js";

type LoginResponse = {
  access_token: string;
  refresh_token: string;
  expires_in_refresh: number;
  expires_in_access: number;
  user_type: number;
  city_data: {
    id_city: number;
    prefix: string;
    translate_key: string;
    timezone_name: string;
    country_code: string;
    market_status: number;
    name: string;
  };
  user_role: string;
};

type LoginPayload = {
  application_key: string;
  username: string;
  password: string;
};

type Lesson = {
  date: string;
  lesson: number;
  started_at: string;
  finished_at: string;
  teacher_name: string;
  subject_name: string;
  room_name: string;
};

type News = {
  id_bbs: number;
  theme: string;
  time: string;
  viewed: boolean;
};

type NewsDetails = {
  id_bbs: number;
  theme: number;
  time: string;
  text_bbs: string;
};

export class OmniaApiClient {
  private baseUrl = "https://msapi.top-academy.ru";
  private accessToken: string | null = null;
  private accessTokenExpires: number | null = null;

  async fetchTable(): Promise<Lesson[] | null> {
    if (!(await this.checkLogin())) return null;

    return this.fetchWithRetry<Lesson[]>(
      `${this.baseUrl}/api/v2/schedule/operations/get-month?date_filter=${DateTime().toFormat(AppConfig.TimeFormat)}`,
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "ru_RU, ru",
          authorization: `Bearer ${this.accessToken}`,
          priority: "u=1, i",
          "sec-ch-ua":
            '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          Referer: "https://journal.top-academy.ru/",
        },
        body: null,
        method: "GET",
      },
    );
  }

  async fetchToken(): Promise<LoginResponse | null> {
    const payload = {
      application_key: AppConfig.OmniaAppKey,
      username: AppConfig.OmniaUsername,
      password: AppConfig.OmniaPassword,
    } satisfies LoginPayload;

    return this.fetchWithRetry<LoginResponse>(
      `${this.baseUrl}/api/v2/auth/login`,
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "ru_RU, ru",
          authorization: "Bearer null",
          "content-type": "application/json",
          priority: "u=1, i",
          "sec-ch-ua":
            '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
        },
        referrer: "https://journal.top-academy.ru/",
        body: JSON.stringify(payload),
        method: "POST",
        mode: "cors",
        credentials: "include",
      },
    );
  }

  async fetchLastNews(): Promise<News[] | null> {
    if (!(await this.checkLogin())) return null;

    return this.fetchWithRetry<News[]>(
      `${this.baseUrl}/api/v2/news/operations/latest-news`,
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "ru_RU, ru",
          authorization: `Bearer ${this.accessToken}`,
          priority: "u=1, i",
          "sec-ch-ua":
            '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
        },
        referrer: "https://journal.top-academy.ru/",
        body: null,
        method: "GET",
      },
    );
  }

  async fetchNewsDetails(id: number): Promise<NewsDetails | null> {
    if (!(await this.checkLogin())) return null;

    return this.fetchWithRetry<NewsDetails>(
      `${this.baseUrl}/api/v2/news/operations/detail-news?news_id=${id}`,
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "ru_RU, ru",
          authorization: `Bearer ${this.accessToken}`,
          priority: "u=1, i",
          "sec-ch-ua":
            '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          Referer: "https://journal.top-academy.ru/",
        },
        body: null,
        method: "GET",
      },
    );
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    tries = 3,
  ): Promise<T | null> {
    let attempt = 0;

    while (attempt < tries) {
      try {
        const res = await fetch(url, options);

        if (res.status >= 200 && res.status < 300) {
          return (await res.json().catch(() => null)) as T | null;
        }
      } catch(err) {
        console.log(`Произошла ошибка: ${err}`)
      }

      attempt++;
    }

    return null;
  }

  private async checkLogin(): Promise<boolean> {
    if (
      !this.accessToken ||
      (this.accessTokenExpires !== null && Date.now() >= this.accessTokenExpires)
    ) {
      const login = await this.fetchToken();
      if (!login) return false;

      this.accessToken = login.access_token;
      this.accessTokenExpires = Date.now() + login.expires_in_access * 1000;
    }

    return true;
  }
}

export const omniaApiClient = new OmniaApiClient();
