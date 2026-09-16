import { DateTime as dt } from "luxon";
import { AppConfig } from "../config.js";

export function DateTime() {
  return dt.now().setZone(AppConfig.Tz);
}
