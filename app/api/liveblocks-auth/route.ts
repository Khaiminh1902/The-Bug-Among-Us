import { NextRequest, NextResponse } from "next/server";

const LIVEBLOCKS_AUTH_URL = "https://api.liveblocks.io/v2/authorize-user";

export async function POST(request: NextRequest) {
  const secretKey = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json(
      { error: "Missing LIVEBLOCKS_SECRET_KEY" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const { room, playerId, name } = body as {
      room?: string;
      playerId?: string;
      name?: string;
    };

    if (!room || !playerId) {
      return NextResponse.json(
        { error: "Missing room or playerId" },
        { status: 400 },
      );
    }

    const response = await fetch(LIVEBLOCKS_AUTH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: playerId,
        userInfo: {
          name: name || "Anonymous",
        },
        permissions: {
          [room]: ["room:write"],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "Liveblocks authorization failed", details: errorText },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
