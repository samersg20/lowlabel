-- Enable Row Level Security for multi-tenant tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Item" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Method" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Method" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Unit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Unit" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ItemGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ItemGroup" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PrinterConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrinterConfig" FORCE ROW LEVEL SECURITY;
ALTER TABLE "LabelPrint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LabelPrint" FORCE ROW LEVEL SECURITY;

-- Policies based on app.tenant_id (or app.bypass_rls for explicit public flows)
CREATE POLICY tenant_isolation_user
  ON "User"
  USING ("tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = '1')
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = '1');

CREATE POLICY tenant_isolation_item
  ON "Item"
  USING ("tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = '1')
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = '1');

CREATE POLICY tenant_isolation_method
  ON "Method"
  USING ("tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = '1')
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = '1');

CREATE POLICY tenant_isolation_unit
  ON "Unit"
  USING ("tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = '1')
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = '1');

CREATE POLICY tenant_isolation_item_group
  ON "ItemGroup"
  USING ("tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = '1')
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = '1');

CREATE POLICY tenant_isolation_printer_config
  ON "PrinterConfig"
  USING ("tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = '1')
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = '1');

CREATE POLICY tenant_isolation_label_print
  ON "LabelPrint"
  USING ("tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = '1')
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = '1');
