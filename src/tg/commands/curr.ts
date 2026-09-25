import { DateTime } from "../../tools/datetime-now.js";
import type { AppContext } from "../types.js";

export async function currPairCommand(ctx: AppContext) {
    const now = DateTime()
    const [hour, minute] = [now.hour, now.minute]

    let lesson: number = 1; 

    switch(true) {
        case (hour >= 8 && hour < 10):
            lesson = 1
            break
        case hour >= 10 || (hour <= 11 && minute < 30):
            lesson = 2
            break
    }
}