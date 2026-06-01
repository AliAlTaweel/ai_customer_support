-- 🔒 Supabase PostgreSQL Row-Level Security (RLS) Migration
-- Run this script on your Supabase SQL Editor to enable tenant-isolation at the database layer.

-- 1️⃣ Enable Row-Level Security on all multi-tenant tables
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Complaint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FAQ" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FAQEmbedding" ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Create helper function to map Clerk's 'org_id' claim from JWT to DB Tenant UUID
CREATE OR REPLACE FUNCTION auth.get_tenant_id_by_org() 
RETURNS uuid AS $$
  SELECT id FROM "Tenant" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id')::text;
$$ LANGUAGE sql SECURITY DEFINER;

-- 3️⃣ Define policies for Tenant table
CREATE POLICY tenant_isolation_policy ON "Tenant"
  FOR ALL
  TO authenticated
  USING ("clerkOrgId" = (auth.jwt() ->> 'org_id')::text)
  WITH CHECK ("clerkOrgId" = (auth.jwt() ->> 'org_id')::text);

-- 4️⃣ Define policies for Product table (Client Admin CRUD)
CREATE POLICY product_tenant_isolation_policy ON "Product"
  FOR ALL
  TO authenticated
  USING ("tenantId" = auth.get_tenant_id_by_org())
  WITH CHECK ("tenantId" = auth.get_tenant_id_by_org());

-- Allow anonymous public reads for the embedded web widgets
CREATE POLICY product_public_widget_read_policy ON "Product"
  FOR SELECT
  TO anon
  USING (true);

-- 5️⃣ Define policies for Order table
CREATE POLICY order_tenant_isolation_policy ON "Order"
  FOR ALL
  TO authenticated
  USING ("tenantId" = auth.get_tenant_id_by_org())
  WITH CHECK ("tenantId" = auth.get_tenant_id_by_org());

-- 6️⃣ Define policies for OrderItem table
CREATE POLICY order_item_tenant_isolation_policy ON "OrderItem"
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "Order" o 
    WHERE o.id = "orderId" AND o."tenantId" = auth.get_tenant_id_by_org()
  ));

-- 7️⃣ Define policies for ChatMessage table
CREATE POLICY chat_message_tenant_isolation_policy ON "ChatMessage"
  FOR ALL
  TO authenticated
  USING ("tenantId" = auth.get_tenant_id_by_org())
  WITH CHECK ("tenantId" = auth.get_tenant_id_by_org());

-- 8️⃣ Define policies for Complaint table
CREATE POLICY complaint_tenant_isolation_policy ON "Complaint"
  FOR ALL
  TO authenticated
  USING ("tenantId" = auth.get_tenant_id_by_org())
  WITH CHECK ("tenantId" = auth.get_tenant_id_by_org());

-- 9️⃣ Define policies for FAQ table
CREATE POLICY faq_tenant_isolation_policy ON "FAQ"
  FOR ALL
  TO authenticated
  USING ("tenantId" = auth.get_tenant_id_by_org())
  WITH CHECK ("tenantId" = auth.get_tenant_id_by_org());

-- 🔟 Define policies for FAQEmbedding table
CREATE POLICY faq_embedding_tenant_isolation_policy ON "FAQEmbedding"
  FOR ALL
  TO authenticated
  USING ("tenantId" = auth.get_tenant_id_by_org())
  WITH CHECK ("tenantId" = auth.get_tenant_id_by_org());
