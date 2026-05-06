export const runtime = "edge";

const CLERK_FRONTEND_API = "https://frontend-api.clerk.dev";

async function proxyToClerk(request: Request): Promise<Response> {
  const { pathname, search } = new URL(request.url);

  // Strip the /--clerk prefix, then forward to Clerk's Frontend API
  const clerkPath = pathname.replace(/^\/--clerk/, "") || "/";
  const target = `${CLERK_FRONTEND_API}${clerkPath}${search}`;

  const headers = new Headers(request.headers);
  
  // Set Clerk proxy required headers
  headers.set("Clerk-Proxy-Url", "https://d1s8t1kufg9t1w.amplifyapp.com/--clerk");
  
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return new Response(JSON.stringify({ error: "CLERK_SECRET_KEY is not configured" }), { status: 500 });
  }
  headers.set("Clerk-Secret-Key", secretKey);
  headers.set("Authorization", `Bearer ${secretKey}`);

  // Set X-Forwarded-For to real client IP
  const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "";
  if (forwardedFor) {
    headers.set("X-Forwarded-For", forwardedFor);
  }
  
  headers.set("X-Forwarded-Host", "d1s8t1kufg9t1w.amplifyapp.com");
  headers.set("X-Forwarded-Proto", "https");

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    // @ts-ignore
    init.body = request.body;
    // @ts-ignore
    init.duplex = "half";
  }

  try {
    const response = await fetch(target, init);
    return response;
  } catch (error: any) {
    console.error("Error proxying to Clerk:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function GET(request: Request) { return proxyToClerk(request); }
export async function POST(request: Request) { return proxyToClerk(request); }
export async function PUT(request: Request) { return proxyToClerk(request); }
export async function PATCH(request: Request) { return proxyToClerk(request); }
export async function DELETE(request: Request) { return proxyToClerk(request); }
export async function HEAD(request: Request) { return proxyToClerk(request); }
export async function OPTIONS(request: Request) { return proxyToClerk(request); }
