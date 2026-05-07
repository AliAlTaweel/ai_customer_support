// Disable SSL validation for internal proxy requests to bypass AWS Amplify's multi-level subdomain certificate limitation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const CLERK_FRONTEND_API = "https://frontend-api.clerk.dev";

async function proxyToClerk(request: Request): Promise<Response> {
  const url = new URL(request.url);
  url.searchParams.delete("rest");

  const clerkPath = url.pathname.replace(/^\/__clerk/, "") || "/";
  const target = `${CLERK_FRONTEND_API}${clerkPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.set("Clerk-Proxy-Url", "https://main.d1s8t1kufg9t1w.amplifyapp.com/--clerk");
  if (process.env.CLERK_SECRET_KEY) {
    headers.set("Clerk-Secret-Key", process.env.CLERK_SECRET_KEY);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json") || contentType.includes("application/x-www-form-urlencoded") || contentType.includes("text/")) {
      init.body = await request.text();
    } else {
      init.body = await request.arrayBuffer();
    }
  }

  try {
    const response = await fetch(target, init);
    
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("Error proxying to Clerk:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

export async function GET(request: Request) { return proxyToClerk(request); }
export async function POST(request: Request) { return proxyToClerk(request); }
export async function PUT(request: Request) { return proxyToClerk(request); }
export async function PATCH(request: Request) { return proxyToClerk(request); }
export async function DELETE(request: Request) { return proxyToClerk(request); }
export async function HEAD(request: Request) { return proxyToClerk(request); }
export async function OPTIONS(request: Request) { return proxyToClerk(request); }
