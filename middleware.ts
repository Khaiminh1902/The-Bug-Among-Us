import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const gameMatch = pathname.match(/^\/game\/([^/]+)(?:\/([^/]+))?$/);

  if (gameMatch) {
    const roomId = gameMatch[1];
    const phase = gameMatch[2];

    const hasAuth = request.cookies.has("game-auth");
    const roomMatch = request.cookies.get("game-room")?.value === roomId;

    if (!hasAuth || !roomMatch) {
      if (phase && phase !== "lobby") {
        return NextResponse.redirect(new URL(`/game/${roomId}`, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/game/:path*",
};