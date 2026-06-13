# Security Review & Recommendations

**Date**: 2026-06-13  
**Project**: AI Customer Support v3  
**Reviewer**: Claude Security Analysis  
**Scope**: Overview of security issues in current codebase

---

## Executive Summary

The project has solid foundational security measures (RLS policies, parameterized queries, PII handling) but contains **critical authorization gaps** where tenant isolation isn't consistently enforced at the application layer. The primary risks involve potential cross-tenant data access through weak admin authorization and missing tenant filters in queries.

---

## 🔴 HIGH SEVERITY ISSUES

### 1. Weak Admin Authorization - No Tenant Isolation

**File**: `frontend/src/lib/actions/admin.ts` (Lines 14-26)

**Problem**:
The `isAdmin()` function performs only a simple email comparison without any tenant context validation:

```typescript
export async function isAdmin() {
  try {
    const user = await currentUser();
    if (user) {
      const email = user.emailAddresses[0]?.emailAddress;
      return email?.toLowerCase() === ADMIN_EMAIL?.toLowerCase();
    }
  } catch (error) {
    console.error("Error checking Clerk user in isAdmin:", error);
  }
  return false;
}
```

**Vulnerability**: 
- A global admin account could access or modify any tenant's data if database-level RLS isn't properly enforced
- No verification that the admin belongs to the current tenant context
- All admin functions rely on this single, tenant-unaware check
- If RLS enforcement fails or has bugs, there's no application-level protection

**Impact**: Cross-tenant data access, unauthorized modifications to other customers' orders/complaints

**Affected Functions**:
- `getAllOrders()`
- `updateOrderStatus()`
- `deleteOrder()`
- `getAllComplaints()`
- `updateComplaintStatus()`
- `deleteComplaint()`
- `updateComplaintNotes()`
- `assignComplaintAgent()`
- `getComplaintTranscript()`
- `getAllProductsAdmin()`
- `createProduct()`
- `updateProduct()`
- `deleteProduct()`
- `getAllFAQs()`
- `createFAQ()`
- `updateFAQ()`
- `deleteFAQ()`

**Recommendation**:
1. Implement tenant-aware authorization that verifies the user belongs to the current tenant
2. Add a `tenantId` claim to the JWT token (already being used in `auth.py`)
3. Modify `isAdmin()` to accept and validate tenant context:

```typescript
export async function isAdmin(tenantId?: string) {
  try {
    const user = await currentUser();
    if (!user) return false;
    
    const email = user.emailAddresses[0]?.emailAddress;
    if (email?.toLowerCase() !== ADMIN_EMAIL?.toLowerCase()) {
      return false;
    }
    
    // If tenantId is provided, verify the admin belongs to this tenant
    if (tenantId) {
      // Fetch user's organization and verify they belong to this tenant
      const prisma = await getPrisma();
      const userTenant = await prisma.tenant.findFirst({
        where: {
          clerkOrgId: user.publicMetadata?.org_id as string
        }
      });
      return userTenant?.id === tenantId;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking Clerk user in isAdmin:", error);
    return false;
  }
}
```

---

### 2. Missing Tenant Isolation in Complaint Transcript Query

**File**: `frontend/src/lib/actions/admin.ts` (Lines 189-216)

**Problem**:
The `getComplaintTranscript` function queries chat messages without filtering by tenant:

```typescript
export async function getComplaintTranscript(chatSessionId: string) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
  if (!chatSessionId) return { success: true, messages: [] };

  try {
    const prisma = await getPrisma();
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { userId: chatSessionId },
          { userName: chatSessionId }
        ]
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    // ❌ No tenantId filter present
    return {
      success: true,
      messages: JSON.parse(JSON.stringify(messages))
    };
  } catch (error) {
    const err = error as Error;
    console.error("[ADMIN ERROR] Failed to fetch transcript:", err);
    return { success: false, error: `Failed to fetch transcript: ${err.message}` };
  }
}
```

**Vulnerability**:
- If a user from Tenant A knows a userId/userName from Tenant B, they could retrieve Tenant B's chat messages
- Relies entirely on Supabase RLS enforcement, which may not be applied if:
  - Prisma connection isn't properly authenticated with JWT token
  - RLS policies have bugs or exceptions
  - The Prisma client uses a service role key (which bypasses RLS)

**Impact**: Unauthorized access to other tenants' chat history and sensitive customer conversations

**Recommendation**:
Always explicitly filter by current tenant's ID, don't rely solely on RLS:

```typescript
export async function getComplaintTranscript(chatSessionId: string) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
  if (!chatSessionId) return { success: true, messages: [] };

  try {
    const prisma = await getPrisma();
    const currentUser = await currentUser();
    const currentTenantId = await getCurrentTenantId(currentUser);
    
    const messages = await prisma.chatMessage.findMany({
      where: {
        tenantId: currentTenantId,  // ✅ Explicit tenant filter
        OR: [
          { userId: chatSessionId },
          { userName: chatSessionId }
        ]
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return {
      success: true,
      messages: JSON.parse(JSON.stringify(messages))
    };
  } catch (error) {
    const err = error as Error;
    console.error("[ADMIN ERROR] Failed to fetch transcript:", err);
    return { success: false, error: `Failed to fetch transcript: ${err.message}` };
  }
}
```

---

### 3. Sensitive Information Exposed in Environment File Comments

**File**: `backend/.env` (Line 49)

**Problem**:
The `.env` file contains instructions with hardcoded references to SSH key and EC2 IP address:

```env
# cd /Users/alial-taweel/projects/ai/ai_customer_support_v3 ls luxe-ec2-key-1.pem
# This should print the filename if you are in the right spot 
# ssh -i "luxe-ec2-key-1.pem" ubuntu@13.63.20.159
```

**Vulnerability**:
- Even though the key file is in `.gitignore`, this comment documents how to access an EC2 instance
- IP address `13.63.20.159` is exposed
- If someone gains access to the development environment or repository, they have clear instructions to access infrastructure
- These comments should never be in version control

**Impact**: Infrastructure reconnaissance, potential unauthorized access to EC2 instances

**Recommendation**:
1. Remove all commented-out infrastructure access instructions from committed files
2. Never commit IP addresses, SSH key references, or access instructions
3. Use proper documentation outside of code repositories (e.g., internal wiki, secure note system)
4. All infrastructure setup should be documented in a private, access-controlled location

**Action**:
```bash
# Remove or clean the backend/.env file of sensitive comments
# These comments should only exist in local, uncommitted versions
```

---

## 🟡 MEDIUM SEVERITY ISSUES

### 4. Plaintext Database Credentials in Development Environment

**Files**: 
- `frontend/.env` (lines 3, 22-24, 54-55)
- `backend/.env` (lines 21, 28, 30-31, 51-55)

**Examples of Exposed Credentials**:

Frontend `.env`:
```
DATABASE_URL="postgresql://postgres.gitkokqbujwgsuedaqro:eIMu36ZwuqugzI7G@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
username:cs_v3_db
password:P3BnSimXt28hKcTqSm8N
Endpoint:customer-support-v3-db.cj2aoksa6m3y.eu-north-1.rds.amazonaws.com
NEXT_PUBLIC_API_KEY=test-key-ali
```

Backend `.env`:
```
GOOGLE_API_KEY=AIzaSyBZdiiTfs31kGgN_ruzY9PU3RZ1l9VZpuU
AWS_ACCESS_KEY_ID=4eaea4434a9f787fe17e18d073eb2ccc
AWS_SECRET_ACCESS_KEY=3558b895a4851340d0ef4da1f2afaec97d0c403f0db8ed4774d6ecd51e0c9f68
SUPABASE_PASSWORD:eIMu36ZwuqugzI7G
DATABASE_URL="postgresql://postgres.gitkokqbujwgsuedaqro:eIMu36ZwuqugzI7G@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"
```

**Risk**:
- While `.env` files are in `.gitignore` (good!), they still exist in plaintext in the working directory
- If the development machine is compromised, all production credentials are exposed
- System administrators may back up working directories
- Docker builds might accidentally include `.env` files
- CI/CD systems may have access to these files
- Loss of developer laptops = loss of all credentials

**Impact**: Full access to databases, AWS infrastructure, API services, and cloud storage

**Recommendation** (Priority Order):
1. **Immediate**: Rotate all exposed credentials (passwords, API keys, AWS credentials)
2. **Short-term**: Implement a secrets management system:
   - AWS Secrets Manager
   - HashiCorp Vault
   - 1Password/LastPass for teams
   - Azure Key Vault (if using Azure)

3. **Medium-term**: 
   - Use temporary credentials with short TTLs (STS tokens, time-limited API keys)
   - Implement credential rotation policies
   - Use IAM roles instead of long-lived credentials (for AWS services)
   - For development, use local mock services (LocalStack for AWS, Supabase local development)

4. **Best Practice**: 
```bash
# Never commit credentials
# Use environment variables loaded from secure sources
# Example with AWS Secrets Manager:
export DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id prod/db/password --query SecretString --output text)

# Or use .env.local (never committed) for development only
# .env - committed with placeholders
# .env.local - local development, in .gitignore, actual credentials
```

---

## ✅ Positive Security Measures Found

### 1. Database-Level RLS Policies
**File**: `frontend/prisma/rls_policies.sql`

Good news: Proper Row-Level Security policies are defined for all critical tables:
- `Tenant` table - org isolation
- `Product`, `Order`, `OrderItem` - tenant isolation
- `ChatMessage`, `Complaint`, `FAQ`, `FAQEmbedding` - tenant isolation
- `PerformanceMetric` - tenant isolation

**Action**: Continue maintaining and testing these policies. Add automated tests to verify RLS enforcement.

### 2. Parameterized SQL Queries
**Files**: `backend/app/tools/order_tools.py`, `backend/app/tools/support_tools.py`

Good practice: All SQL queries use parameterized queries with named parameters:
```python
# ✅ Safe: Using text() with named parameters
sql = 'SELECT id, subject, status, priority, "createdAt" FROM "Complaint" WHERE "customerEmail" = :email AND "tenantId" = :tenant_id'
params = {"email": customer_email, "tenant_id": tenant_id}
result = connection.execute(text(sql), params)

# SQLAlchemy ORM filters also prevent injection
query = query.filter(Order.customerEmail.ilike(target_email))
```

**Action**: Maintain this practice. Do code reviews to prevent any future raw string concatenation in SQL.

### 3. PII Masking and Encryption
**File**: `backend/app/core/privacy.py`

Excellent implementation with:
- PII pseudonymization with encrypted tokens
- Stateless encryption using Fernet (symmetric, strong)
- Regex-based fallback detection for emails, phones, addresses
- Presidio NLP-based PII detection
- Proper logging without exposing raw sensitive data

**Action**: Continue using this for all PII before sending to LLM or logging.

### 4. Proper JWT Verification
**File**: `backend/app/core/auth.py`

Good security practices:
- Fetches JWKS from Clerk for RS256 signature verification
- Caches JWKS with TTL
- Proper error handling
- Debug logs at debug level (not info)
- Validates JWT before creating user context

**Action**: Keep this implementation. The fallback to unverified JWT with error is appropriate for dev environments.

### 5. .gitignore Properly Configured
**File**: `.gitignore`

Correctly excludes:
- `*.pem` - SSH keys
- `.env` - environment files
- `*.log` - logs
- `__pycache__/`, `node_modules/` - dependencies
- Private notes

**Action**: Ensure this is maintained and add additional sensitive file patterns if needed.

---

## 🎯 Action Items Summary

### Critical (Fix Immediately):
- [ ] **Issue #1**: Add tenant filtering to `getComplaintTranscript()` and all other queries
- [ ] **Issue #2**: Implement tenant-aware `isAdmin()` authorization
- [ ] **Issue #3**: Remove infrastructure access instructions from `.env` files
- [ ] **Credentials**: Rotate all exposed database passwords and API keys

### Important (Fix Soon):
- [ ] Implement secrets management (AWS Secrets Manager, Vault, etc.)
- [ ] Set up temporary credential rotation
- [ ] Add explicit tenant context validation to all admin functions
- [ ] Write tests to verify RLS policies are enforced

### Nice to Have (Longer Term):
- [ ] Use IAM roles instead of long-lived AWS credentials
- [ ] Implement local development environment (mock services)
- [ ] Set up automated secrets scanning in CI/CD
- [ ] Implement audit logging for admin actions
- [ ] Add request signing/verification for API calls

---

## Testing Recommendations

### 1. Test Tenant Isolation
```typescript
// Test that User A cannot access User B's data
test('Admin from Tenant A cannot access Tenant B chat messages', async () => {
  // Setup: Create chat messages in Tenant B
  // Action: Admin from Tenant A requests transcript with Tenant B's userId
  // Assert: Should return empty or error, not Tenant B's messages
});
```

### 2. Test RLS Policies
```sql
-- Verify RLS policies are enforced at database level
SELECT * FROM "ChatMessage" WHERE "tenantId" != current_user_tenant_id;
-- Should return 0 rows regardless of what's in the database
```

### 3. Test Authorization Bypass
```typescript
// Test that modifying Authorization header doesn't bypass checks
test('Cannot escalate privileges by modifying token', async () => {
  // Attempt to modify JWT claims
  // Assert: Request should fail with 401/403
});
```

---

## References & Standards

- **OWASP Top 10**: A1 - Broken Access Control, A2 - Cryptographic Failures
- **CWE-639**: Authorization Bypass Through User-Controlled Key
- **CWE-434**: Unrestricted Upload of File with Dangerous Type
- **NIST Cybersecurity Framework**: Access Control, Asset Management

---

## Questions & Follow-up

1. Is the `ADMIN_EMAIL` environment variable the only way to designate admins? Should we support role-based access control (RBAC)?

2. Does Prisma use a service role key (which bypasses RLS) or user-authenticated keys?

3. Are there automated tests for RLS policy enforcement in the current CI/CD pipeline?

4. What is the credential rotation policy for AWS keys, database passwords, and API keys?

5. Are there audit logs for admin actions (queries, modifications)?

---

**Report Generated**: 2026-06-13
