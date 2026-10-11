import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/sign-up(.*)",
  "/api/health(.*)",
]);

const isAuthPage = createRouteMatcher(["/login(.*)", "/sign-up(.*)"]);

const handleClerk = clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  if (userId && isAuthPage(request)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return handleClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
