import { getBot } from "@/lib/bot";

export async function POST(req: Request) {
  const bot = getBot();
  return bot.webhooks.telegram(req);
}
