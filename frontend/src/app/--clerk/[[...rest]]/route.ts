export const runtime = "edge";

const CLERK_FRONTEND_API = "https://clerk.d1s8t1kufg9t1w.amplifyapp.com";

async function proxyToClerk(request: Request): Promise<Response> {
  const { pathname, search } = new URL(request.url);

  // Strip the /--clerk prefix, then forward to Clerk's Frontend API
  const clerkPath = pathname.replace(/^\/--clerk/, "") || "/";
  const target = `${CLERK_FRONTEND_API}${clerkPath}${search}`;

  const headers = new Headers(request.headers);
  // Preserve the real client IP if present
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    // @ts-ignore – duplex is required for streaming bodies in some runtimes
    init.body = request.body;
    // @ts-ignore
    init.duplex = "half";
  }

  return fetch(target, init);
}

export async function GET(request: Request) { return proxyToClerk(request); }
export async function POST(request: Request) { return proxyToClerk(request); }
export async function PUT(request: Request) { return proxyToClerk(request); }
export async function PATCH(request: Request) { return proxyToClerk(request); }
export async function DELETE(request: Request) { return proxyToClerk(request); }
export async function HEAD(request: Request) { return proxyToClerk(request); }
export async function OPTIONS(request: Request) { return proxyToClerk(request); }
