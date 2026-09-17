import { AppConfig } from "../config.js";
import { DateTime } from "../tools/datetime-now.js";
import { formatDateString } from "../tools/format-date-string.js";

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
  time: string; // date string
  viewed: boolean; // my own field :)
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

  async fetchTable() {
    let data: Lesson[] | null = null;

    if (!(await this.checkLogin())) {
      return data;
    }

    const res = await this.fetchWithRetry(
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

    data = await res.json();

    return data;
  }

  async fetchToken(): Promise<null | LoginResponse> {
    const payload = {
      application_key: AppConfig.OmniaAppKey,
      username: AppConfig.OmniaUsername,
      password: AppConfig.OmniaPassword,
    } satisfies LoginPayload;

    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v2/auth/login`, {
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
    });

    let data: LoginResponse | null = await res.json().catch(() => null);

    return data;
  }

  async fetchLastNews() {
    let data: News[] | null = null;

    if (!(await this.checkLogin())) {
      return data;
    }

    const res = await this.fetchWithRetry(
      "https://msapi.top-academy.ru/api/v2/news/operations/latest-news",
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

    data = await res.json().catch(() => null);

    return data;
  }

  async fetchNewsDetails(id: number) {
    let data: NewsDetails | null = null;

    if (!(await this.checkLogin())) {
      return data;
    }

    const res = await this.fetchWithRetry(
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

    data = await res.json().catch(() => null);

    return data;
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit = {},
    retries = 3,
    delay = 500,
  ): Promise<Response> {
    let lastErr: unknown;

    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, init);
        if (res.ok) return res;
        lastErr = new Error(`HTTP ${res.status}`);
      } catch (err) {
        lastErr = err;
      }

      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delay * (i + 1)));
      }
    }

    throw lastErr;
  }

  private async checkLogin() {
    if (
      !this.accessToken ||
      (this.accessTokenExpires && Date.now() > this.accessTokenExpires)
    ) {
      const login = await this.fetchToken();

      if (!login) {
        return false;
      }

      this.accessToken = login?.access_token;
      this.accessTokenExpires = login?.expires_in_access;
    }
    return true;
  }
}

export const omniaApiClient = new OmniaApiClient();
