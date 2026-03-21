import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Rocky</h1>
        <p className="text-muted-foreground">Your AI ops agent, everywhere.</p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Open Dashboard
      </Link>
    </div>
  );
}
