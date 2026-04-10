import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, phase, playerId, clear } = body;

    const response = NextResponse.json({ success: true });

    if (clear) {
      response.cookies.set("game-room", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });

      response.cookies.set("game-auth", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });

      response.cookies.set("player-id", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });

      return response;
    }

    if (!roomId || !phase) {
      return NextResponse.json(
        { error: "Missing roomId or phase" },
        { status: 400 }
      );
    }

    response.cookies.set("game-room", roomId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 2,
      path: "/",
    });

    response.cookies.set("game-auth", phase, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 2,
      path: "/",
    });

    if (playerId) {
      response.cookies.set("player-id", playerId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 2,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}