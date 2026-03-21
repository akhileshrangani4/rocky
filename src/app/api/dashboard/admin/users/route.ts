import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getAllowedUsers,
  addAllowedUser,
  removeAllowedUser,
  type Platform,
} from "@/lib/allowed-users";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await getAllowedUsers();
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { platform, platformUserId, platformUsername } = body;

  if (!platform || !platformUserId) {
    return NextResponse.json(
      { error: "platform and platformUserId are required" },
      { status: 400 },
    );
  }

  const validPlatforms: Platform[] = [
    "slack",
    "discord",
    "github",
    "linear",
    "telegram",
  ];
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const [user] = await addAllowedUser(platform, platformUserId, platformUsername);
  return NextResponse.json({ user }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await removeAllowedUser(id);
  return NextResponse.json({ success: true });
}
