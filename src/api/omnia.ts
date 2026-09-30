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
  private readonly baseUrl = "https://msapi.top-academy.ru";
  private accessToken: string | null = null;
  private accessTokenExpiresAt: number | null = null;
  private loginPromise: Promise<boolean> | null = null;

  async fetchTable(date?: string): Promise<Lesson[] | null> {
    if (!(await this.checkLogin())) return null;

    const params = new URLSearchParams({
      date_filter: date ?? DateTime().toFormat(AppConfig.TimeFormat),
    });

    return await this.fetchWithRetry<Lesson[]>(
      `${this.baseUrl}/api/v2/schedule/operations/get-month?${params}`,
      this.authenticatedRequestOptions(),
    );
  }

  async fetchToken(): Promise<LoginResponse | null> {
    const payload = {
      application_key: AppConfig.OmniaAppKey,
      username: AppConfig.OmniaUsername,
      password: AppConfig.OmniaPassword,
    } satisfies LoginPayload;

    return await this.fetchWithRetry<LoginResponse>(
      `${this.baseUrl}/api/v2/auth/login`,
      {
        headers: this.defaultHeaders({
          "content-type": "application/json",
          authorization: "Bearer null",
        }),
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

    return await this.fetchWithRetry<News[]>(
      `${this.baseUrl}/api/v2/news/operations/latest-news`,
      this.authenticatedRequestOptions(),
    );
  }

  async fetchNewsDetails(id: number): Promise<NewsDetails | null> {
    if (!(await this.checkLogin())) return null;

    const params = new URLSearchParams({ news_id: String(id) });

    return this.fetchWithRetry<NewsDetails>(
      `${this.baseUrl}/api/v2/news/operations/detail-news?${params}`,
      this.authenticatedRequestOptions(),
    );
  }

  private defaultHeaders(extra: Record<string, string> = {}): HeadersInit {
    return {
      accept: "application/json, text/plain, */*",
      "accept-language": "ru_RU, ru",
      priority: "u=1, i",
      "sec-ch-ua":
        '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      Referer: "https://journal.top-academy.ru/",
      ...extra,
    };
  }

  private authenticatedRequestOptions(): RequestInit {
    return {
      headers: this.defaultHeaders({
        authorization: `Bearer ${this.accessToken}`,
      }),
      method: "GET",
    };
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    maxAttempts = 3,
  ): Promise<T | null> {
    const method = options.method ?? "GET";
    const endpoint = this.getEndpoint(url);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, options);

        if (response.ok) {
          const body = await response.text();

          if (!body) return null;

          try {
            return JSON.parse(body) as T;
          } catch (error) {
            console.error("[OmniaApiClient] Invalid JSON response", {
              method,
              endpoint,
              error: this.describeError(error),
            });
            return null;
          }
        }

        const retrying =
          attempt < maxAttempts && this.isRetryableStatus(response.status);

        console.warn("[OmniaApiClient] Request failed", {
          method,
          endpoint,
          attempt,
          maxAttempts,
          status: response.status,
          statusText: response.statusText,
          retrying,
        });

        if (!retrying) return null;

        await this.delay(this.getRetryDelay(response, attempt));
      } catch (error) {
        const retrying = attempt < maxAttempts;

        console.error("[OmniaApiClient] Request error", {
          method,
          endpoint,
          attempt,
          maxAttempts,
          retrying,
          error: this.describeError(error),
        });

        if (!retrying) return null;

        await this.delay(this.getBackoffDelay(attempt));
      }
    }

    return null;
  }

  private async checkLogin(): Promise<boolean> {
    if (
      this.accessToken &&
      this.accessTokenExpiresAt !== null &&
      Date.now() < this.accessTokenExpiresAt
    ) {
      return true;
    }

    if (!this.loginPromise) {
      this.loginPromise = this.login();
    }

    try {
      return await this.loginPromise;
    } finally {
      this.loginPromise = null;
    }
  }

  private async login(): Promise<boolean> {
    const response = await this.fetchToken();

    if (!response?.access_token) {
      console.error("[OmniaApiClient] Authentication failed: no access token");
      this.accessToken = null;
      this.accessTokenExpiresAt = null;
      return false;
    }

    const lifetimeMs = response.expires_in_access * 1000;
    const safetyMarginMs = Math.min(30_000, lifetimeMs * 0.1);

    this.accessToken = response.access_token;
    this.accessTokenExpiresAt =
      Date.now() + Math.max(0, lifetimeMs - safetyMarginMs);

    return true;
  }

  private isRetryableStatus(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
  }

  private getRetryDelay(response: Response, attempt: number): number {
    const retryAfter = response.headers.get("retry-after");

    if (retryAfter) {
      const seconds = Number(retryAfter);

      if (Number.isFinite(seconds)) {
        return Math.min(seconds * 1000, 10_000);
      }

      const retryAt = Date.parse(retryAfter);
      if (!Number.isNaN(retryAt)) {
        return Math.min(Math.max(0, retryAt - Date.now()), 10_000);
      }
    }

    return this.getBackoffDelay(attempt);
  }

  private getBackoffDelay(attempt: number): number {
    return Math.min(250 * 2 ** (attempt - 1), 2_000);
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private getEndpoint(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return "unknown";
    }
  }

  private describeError(error: unknown): {
    name: string;
    message: string;
    stack?: string;
  } {
    if (error instanceof Error) {
      // @ts-expect-error
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return {
      name: "UnknownError",
      message: String(error),
    };
  }
}

export const omniaApiClient = new OmniaApiClient();
