import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/shop(.*)", "/sign-in(.*)", "/sign-up(.*)", "/--clerk(.*)", "/__clerk(.*)"]);

export const proxy = clerkMiddleware(async (auth, request) => {
  if (!process.env.CLERK_SECRET_KEY) {
    return new Response(JSON.stringify({
      error: "CLERK_SECRET_KEY is missing in Next.js Middleware environment",
      envKeys: Object.keys(process.env).filter(k => !k.toLowerCase().includes("key") && !k.toLowerCase().includes("secret"))
    }), { status: 500, headers: { "content-type": "application/json" } });
  }
  
  try {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  } catch (error: any) {
    if (error?.message === "NEXT_REDIRECT" || error?.digest === "NEXT_REDIRECT") {
      throw error;
    }
    return new Response(JSON.stringify({
      error: "Clerk Middleware execution failed",
      message: error.message,
      stack: error.stack
    }), { status: 500, headers: { "content-type": "application/json" } });
  }
});

export default proxy;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
