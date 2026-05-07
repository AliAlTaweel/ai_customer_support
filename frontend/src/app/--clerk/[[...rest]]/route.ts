export const runtime = "edge";

const CLERK_FRONTEND_API = "https://frontend-api.clerk.dev";

async function proxyToClerk(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // Clean up any Next.js dynamic routing parameters (like 'rest') that platforms like AWS Amplify append to query parameters
  url.searchParams.delete("rest");

  // Strip the /--clerk prefix, then forward to Clerk's Frontend API
  const clerkPath = url.pathname.replace(/^\/--clerk/, "") || "/";
  const target = `${CLERK_FRONTEND_API}${clerkPath}${url.search}`;

  const headers = new Headers(request.headers);
  
  // Remove headers that cause fetch to fail or cause Host mismatches with target
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  
  // Dynamically resolve the request host (covers both apex and subdomains)
  const requestHost = request.headers.get("host") || "d1s8t1kufg9t1w.amplifyapp.com";
  const secretKey = process.env.CLERK_SECRET_KEY || "";
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_live_Y2xlcmsuZDFzOHQxa3VmZzl0MXcuYW1wbGlmeWFwcC5jb20k";
  
  if (!secretKey) {
    return new Response(JSON.stringify({
      error: "CLERK_SECRET_KEY is empty or missing in Route Handler environment",
      envKeys: Object.keys(process.env).filter(k => !k.toLowerCase().includes("key") && !k.toLowerCase().includes("secret"))
    }), { status: 500, headers: { "content-type": "application/json" } });
  }

  headers.set("Clerk-Proxy-Url", `https://${requestHost}/--clerk`);
  headers.set("Clerk-Secret-Key", secretKey);
  headers.set("Authorization", `Bearer ${secretKey}`);
  headers.set("Clerk-Publishable-Key", publishableKey);

  // Set X-Forwarded-For to real client IP
  const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "";
  if (forwardedFor) {
    headers.set("X-Forwarded-For", forwardedFor);
  }
  
  headers.set("X-Forwarded-Host", requestHost);
  headers.set("X-Forwarded-Proto", "https");

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
    
    if (response.status >= 400) {
      const cloned = response.clone();
      try {
        const body = await cloned.json();
        const firstEight = secretKey ? secretKey.substring(0, 8) : "none";
        const lastFour = secretKey ? secretKey.substring(secretKey.length - 4) : "none";
        body.debugInfo = {
          secretKeyPrefix: secretKey ? (secretKey.startsWith("sk_live_") ? "sk_live_" : secretKey.startsWith("sk_test_") ? "sk_test_" : "other") : "empty",
          secretKeyLength: secretKey ? secretKey.length : 0,
          secretKeyParts: `${firstEight}...${lastFour}`,
          requestHost,
          targetUrl: target,
          clerkProxyUrlHeader: `https://${requestHost}/--clerk`,
        };
        return new Response(JSON.stringify(body), {
          status: response.status,
          headers: { "content-type": "application/json" }
        });
      } catch (e) {
        // Fallback if not JSON
      }
    }
    
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
