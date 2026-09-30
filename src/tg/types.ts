import type { CommandsFlavor } from "@grammyjs/commands";
import type { Context } from "grammy";
import type { ConversationFlavor } from "@grammyjs/conversations";

export type AppContext = ConversationFlavor<CommandsFlavor<Context>>;
