import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function unauthorizedResponse() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="75 Hard Admin"',
    },
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";

  if (!adminPassword) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.next();
    }

    return new NextResponse("Admin credentials are not configured", {
      status: 500,
    });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  const base64Credentials = authorization.split(" ")[1] ?? "";
  const credentials = atob(base64Credentials);
  const separatorIndex = credentials.indexOf(":");
  const username = separatorIndex >= 0 ? credentials.slice(0, separatorIndex) : "";
  const password = separatorIndex >= 0 ? credentials.slice(separatorIndex + 1) : "";

  if (username !== adminUsername || password !== adminPassword) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
