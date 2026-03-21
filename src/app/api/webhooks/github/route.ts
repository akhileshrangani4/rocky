import { getBot } from "@/lib/bot";
import { after } from "next/server";

export async function POST(req: Request) {
  const bot = getBot();
  return bot.webhooks.github(req, {
    waitUntil: (p: Promise<unknown>) => after(() => p),
  });
}
