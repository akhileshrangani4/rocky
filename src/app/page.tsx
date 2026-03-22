import Link from "next/link";

const platforms = [
  { name: "Slack", icon: "S", color: "bg-[#4A154B]" },
  { name: "Discord", icon: "D", color: "bg-[#5865F2]" },
  { name: "Telegram", icon: "T", color: "bg-[#229ED9]" },
  { name: "GitHub", icon: "G", color: "bg-[#333]" },
  { name: "Linear", icon: "L", color: "bg-[#5E6AD2]" },
];

const capabilities = [
  {
    title: "Write & ship code",
    description:
      "Clones repos, writes code in sandboxes, runs tests, and opens PRs — all from a chat message.",
  },
  {
    title: "Manage issues",
    description:
      "Creates Linear issues, updates statuses, links PRs, and keeps everything in sync automatically.",
  },
  {
    title: "Schedule meetings",
    description:
      "Creates Google Calendar events with Meet links. Just say who, when, and Rocky handles the rest.",
  },
  {
    title: "100+ integrations",
    description:
      "GitHub, Linear, Gmail, Notion, Google Calendar, and more — all accessible through natural language.",
  },
  {
    title: "Context-aware",
    description:
      "Reads conversation history, issue details, and PR context. Knows what you're talking about without you repeating it.",
  },
  {
    title: "Real-time dashboard",
    description:
      "Track every task, view logs, monitor progress, and manage who has access — all in one place.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="text-lg font-bold">Rocky</span>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-4 pt-24 pb-16 text-center">
        <div className="flex items-center gap-2 mb-6">
          {platforms.map((p) => (
            <span
              key={p.name}
              className={`${p.color} inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white`}
              title={p.name}
            >
              {p.icon}
            </span>
          ))}
        </div>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Your AI ops agent,
          <br />
          <span className="text-muted-foreground">everywhere.</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Rocky lives in Slack, Discord, Telegram, GitHub, and Linear. Tag it,
          give it a task, and it gets things done — writes code, opens PRs,
          manages issues, schedules meetings.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Open Dashboard
          </Link>
          <a
            href="https://github.com/akhileshrangani4/rocky"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            View Source
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold tracking-tight mb-2">
            How it works
          </h2>
          <p className="text-center text-muted-foreground mb-10">
            One agent, five platforms, zero context switching.
          </p>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            <Step number="1" title="Tag Rocky" description="@Rocky in any channel, issue, or DM across any connected platform." />
            <Step number="2" title="Rocky works" description="Reads context, uses tools, writes code, calls APIs — streams progress in real time." />
            <Step number="3" title="Done" description="PR opened, issue updated, meeting scheduled — whatever you asked for, delivered." />
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight mb-2">
          What Rocky can do
        </h2>
        <p className="text-center text-muted-foreground mb-10">
          Backed by AI SDK, Vercel Sandbox, and 100+ Composio integrations.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap) => (
            <div
              key={cap.title}
              className="rounded-lg border border-border bg-card p-5"
            >
              <h3 className="text-sm font-semibold mb-1">{cap.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {cap.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Get started
          </h2>
          <p className="text-muted-foreground mb-6">
            Deploy Rocky, connect your platforms, and start tagging.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign in
            </Link>
            <a
              href="https://github.com/akhileshrangani4/rocky"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 text-xs text-muted-foreground">
          <span>Rocky</span>
          <span>Built with Next.js, Chat SDK, AI SDK, and Vercel</span>
        </div>
      </footer>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card p-6">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold font-mono">
        {number}
      </span>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
