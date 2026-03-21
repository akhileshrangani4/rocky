import { getBot } from "@/lib/bot";
import { after } from "next/server";

export async function POST(req: Request) {
  const bot = getBot();
  return bot.webhooks.discord(req, {
    waitUntil: (p: Promise<unknown>) => after(() => p),
  });
}
