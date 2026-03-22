# Rocky

A personal AI ops agent that lives across Slack, Discord, GitHub, Linear, and Telegram. Tag `@Rocky` anywhere and it gets things done — schedules meetings, creates issues, writes code, opens PRs, and reports everything to a real-time dashboard.

## What it does

- **Slack** — tag `@Rocky` in channels or DM it directly
- **Discord** — tag `@Rocky` in any channel
- **Telegram** — DM the bot directly
- **Linear** — tag `@Rocky` in issue comments, auto-updates issue status and links PRs
- **GitHub** — tag `@rockydevbot` in PR comments

Rocky can:
- Schedule Google Calendar meetings with Meet links
- Create, update, and manage Linear issues
- Search repos, write code in sandboxes, and open PRs
- Browse web pages for context
- Use 100+ tools via Composio (GitHub, Linear, Gmail, Notion, etc.)
- Connect to any MCP server for additional capabilities

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Bot | [Chat SDK](https://chat-sdk.dev) (5 adapters) |
| AI | AI SDK v6 + OpenAI via AI Gateway |
| Tools | [Composio](https://composio.dev) + custom built-ins |
| Code Execution | Vercel Sandbox |
| Auth | Better Auth (Google + GitHub OAuth) |
| Database | Supabase (Postgres) + Drizzle ORM |
| State | Upstash Redis |
| Deploy | Vercel |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/          # Better Auth handler
│   │   ├── webhooks/{slack,discord,telegram,github,linear}/
│   │   └── dashboard/{tasks,stream,admin/users,admin/mcp}/
│   ├── dashboard/
│   │   ├── page.tsx                # Overview (last 24h stats)
│   │   ├── feed/page.tsx           # Real-time activity feed
│   │   ├── tasks/[id]/page.tsx     # Task detail + logs
│   │   └── admin/
│   │       ├── page.tsx            # User allow-list
│   │       └── mcp/page.tsx        # MCP server management
│   ├── sign-in/page.tsx
│   └── layout.tsx
├── components/
│   ├── dashboard/                  # Dashboard UI
│   └── ui/                         # shadcn/ui
├── db/
│   ├── schema.ts                   # Drizzle schema
│   └── index.ts                    # DB client
└── lib/
    ├── agent.ts                    # AI agent (tools + instructions)
    ├── bot.ts                      # Chat SDK (adapters + handlers)
    ├── mcp.ts                      # MCP client connections
    ├── auth.ts                     # Better Auth config
    ├── tasks.ts                    # Task CRUD
    ├── events.ts                   # Redis event bus
    └── tools/
        ├── code-exec.ts            # Vercel Sandbox
        └── browser.ts              # Web browsing
```

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` and fill in your keys:

```bash
cp .env.example .env.local
```

Required:
- `DATABASE_URL` — Supabase Postgres connection string
- `BETTER_AUTH_SECRET` — random secret (`openssl rand -base64 32`)
- `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL` — your domain
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis
- `REDIS_URL` — Upstash Redis URL (`rediss://...`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `AUTH_GITHUB_CLIENT_ID` / `AUTH_GITHUB_CLIENT_SECRET` — GitHub OAuth

Platform adapters (add as needed):
- `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`
- `DISCORD_BOT_TOKEN`, `DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID`
- `TELEGRAM_BOT_TOKEN`
- `GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_BOT_USER_ID`
- `LINEAR_ACCESS_TOKEN`, `LINEAR_WEBHOOK_SECRET`

Optional:
- `COMPOSIO_API_KEY` — enables 100+ tools via Composio
- `GOOGLE_CALENDAR_REFRESH_TOKEN` — Google Calendar integration
- `SENTRY_DSN` — error monitoring

### 3. Database

```bash
npm run db:migrate
```

### 4. Run

```bash
npm run dev
```

### 5. Deploy

```bash
vercel deploy --prod
```

Then set up webhooks for each platform pointing to `https://your-domain.com/api/webhooks/{platform}`.

## Dashboard

The dashboard at `/dashboard` shows:
- **Overview** — task stats for the last 24 hours
- **Feed** — real-time activity stream (polls every 3s)
- **Task Detail** — per-task logs, metadata, input/output
- **Admin** — manage allowed users per platform
- **MCP** — connect external MCP servers with auth

First user to sign in becomes admin automatically.

## Authorization

Rocky only responds to users whose platform IDs are in the allow-list. Add users via the admin panel at `/dashboard/admin`.

## License

MIT
