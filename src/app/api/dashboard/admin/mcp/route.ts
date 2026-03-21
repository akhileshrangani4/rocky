import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { invalidateMCPCache } from "@/lib/mcp";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const servers = await db.select().from(schema.mcpServer);

  // Mask tokens in response
  const masked = servers.map((s) => ({
    ...s,
    authToken: s.authToken ? "••••••" + s.authToken.slice(-4) : null,
  }));

  return NextResponse.json({ servers: masked });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, url, authType, authToken, headerName } = body;

  if (!name || !url) {
    return NextResponse.json({ error: "name and url are required" }, { status: 400 });
  }

  const db = getDb();
  const [server] = await db
    .insert(schema.mcpServer)
    .values({
      name,
      url,
      authType: authType || "none",
      authToken: authToken || null,
      headerName: headerName || null,
      addedBy: session.user.id,
    })
    .returning();

  invalidateMCPCache();
  return NextResponse.json({ server: { ...server, authToken: server.authToken ? "••••••" : null } }, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, enabled, name, url, authType, authToken, headerName } = body;

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = getDb();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof enabled === "boolean") updates.enabled = enabled;
  if (name) updates.name = name;
  if (url) updates.url = url;
  if (authType) updates.authType = authType;
  if (authToken) updates.authToken = authToken;
  if (headerName !== undefined) updates.headerName = headerName;

  await db.update(schema.mcpServer).set(updates).where(eq(schema.mcpServer.id, id));

  invalidateMCPCache();
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = getDb();
  await db.delete(schema.mcpServer).where(eq(schema.mcpServer.id, id));

  invalidateMCPCache();
  return NextResponse.json({ success: true });
}
