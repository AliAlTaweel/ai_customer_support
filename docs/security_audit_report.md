# Security Audit Report: Exposed Keys and Vulnerabilities

**Date:** 2026-05-07
**Target:** AI Customer Support Codebase (outside of `.env` files)

## Executive Summary

A comprehensive code search was conducted across the entire workspace to identify potential security leaks, hardcoded API keys, exposed secrets, and infrastructure vulnerabilities outside of `.env` files. The audit included searches for common secret patterns (e.g., OpenAI keys, AWS keys, Google API keys, Stripe, Clerk, database URIs, JWT tokens, etc.).

**Conclusion:** The codebase is remarkably clean of hardcoded secrets. All critical keys (`DATABASE_URL`, `CLERK_SECRET_KEY`, `GOOGLE_API_KEY`, etc.) are properly referenced via environment variables (`process.env` or Pydantic `Settings`).

However, two infrastructure/configuration-related security leaks were identified and require attention.

---

## Findings

### 1. Hardcoded Backend IP and Unencrypted Traffic (High Severity)
**File:** `frontend/next.config.ts` (Line 15)
**Issue:** The proxy fallback destination is hardcoded to an explicit IP address over unencrypted HTTP: `"http://13.63.20.159:3001/api/v1/:path*"`.
**Impact:**
- **Infrastructure Disclosure:** Exposes the exact IP address and port of the backend server.
- **Man-In-The-Middle (MITM):** Communicating between the Next.js server and the backend over `http://` instead of `https://` allows network traffic to be intercepted or modified if the connection leaves the secure VPC.
**Recommendation:** Ensure the backend is secured behind a domain with an SSL/TLS certificate (HTTPS), and use a generic environment variable for the API URL without a hardcoded fallback IP.

### 2. Environment Variable Name Disclosure (Medium Severity)
**File:** `frontend/src/proxy.ts` (Line 9)
**Issue:** In the event that `CLERK_SECRET_KEY` is missing, the application returns a `500` error response that includes:
`envKeys: Object.keys(process.env).filter(k => !k.toLowerCase().includes("key") && !k.toLowerCase().includes("secret"))`
**Impact:**
- **Information Leak:** While the code attempts to filter out keys containing "key" or "secret", and it only leaks the *names* of the environment variables (not their values), this still exposes the internal environment structure. It could reveal the presence of specific integrations or undocumented internal variables to malicious users.
**Recommendation:** Remove the `envKeys` property from the error response entirely. A generic error message (e.g., `"Authentication configuration error"`) is sufficient and more secure.

---

## Checks Performed
- **AWS Credentials:** No `AKIA` or `ASIA` strings found.
- **Google API Keys:** No `AIza` strings found.
- **OpenAI Keys:** No `sk-...` strings found.
- **Database URLs:** All `DATABASE_URL` references correctly use environment variables (e.g., `process.env.DATABASE_URL`).
- **Clerk Auth:** `CLERK_SECRET_KEY` is properly managed via environment variables. The URLs in `route.ts` point to the public API (`https://frontend-api.clerk.dev`), which is safe.
- **Tokens/Passwords:** No hardcoded assignments of tokens, passwords, or secrets (e.g., `password = "..."`) were found in application code.

## Next Steps
1. Update `frontend/next.config.ts` to remove the hardcoded IP address.
2. Remove the `Object.keys(process.env)` debug output from `frontend/src/proxy.ts`.
