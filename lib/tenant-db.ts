import { prisma } from "@/lib/prisma";

type TenantId = string;

const TENANT_MODELS = new Set([
  "User",
  "Item",
  "Method",
  "Unit",
  "ItemGroup",
  "PrinterConfig",
  "LabelPrint",
]);

const TENANT_BY_ID_MODELS = new Set(["Tenant"]);

const FORBIDDEN_OPERATIONS = new Set(["findUnique", "update", "delete", "upsert"]);

function ensureTenantId(tenantId: string) {
  if (!tenantId) throw new Error("tenantId_required");
  return tenantId;
}

function addTenantWhere(tenantId: string, where: any) {
  if (!where) return { tenantId };
  return { AND: [where, { tenantId }] };
}

function addTenantIdWhere(tenantId: string, where: any) {
  if (!where) return { id: tenantId };
  return { AND: [where, { id: tenantId }] };
}

function addTenantToData(tenantId: string, data: any) {
  if (Array.isArray(data)) return data.map((row) => ({ ...row, tenantId }));
  return { ...data, tenantId };
}

function tenantScopedClient(tenantId: TenantId) {
  const scopedTenantId = ensureTenantId(tenantId);

  return prisma.$extends({
    query: {
      async $allOperations({ model, operation, args, query }: any) {
        if (!model) return query(args);

        if (FORBIDDEN_OPERATIONS.has(operation)) {
          throw new Error(`tenantDb_forbidden_operation:${operation}`);
        }

        if (TENANT_MODELS.has(model)) {
          if (operation === "create" || operation === "createMany") {
            args.data = addTenantToData(scopedTenantId, args.data);
          }
          if (operation === "findMany" || operation === "findFirst" || operation === "count" || operation === "aggregate" || operation === "groupBy") {
            args.where = addTenantWhere(scopedTenantId, args.where);
          }
          if (operation === "updateMany" || operation === "deleteMany") {
            args.where = addTenantWhere(scopedTenantId, args.where);
          }
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`select set_config('app.tenant_id', ${scopedTenantId}, true)`,
            query(args),
          ]);
          return result;
        }

        if (TENANT_BY_ID_MODELS.has(model)) {
          if (operation === "findMany" || operation === "findFirst" || operation === "count" || operation === "aggregate" || operation === "groupBy") {
            args.where = addTenantIdWhere(scopedTenantId, args.where);
          }
          if (operation === "updateMany" || operation === "deleteMany") {
            args.where = addTenantIdWhere(scopedTenantId, args.where);
          }
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`select set_config('app.tenant_id', ${scopedTenantId}, true)`,
            query(args),
          ]);
          return result;
        }

        throw new Error(`tenantDb_forbidden_model:${model}`);
      },
    },
  });
}

export function tenantDb(tenantId: TenantId) {
  return tenantScopedClient(tenantId);
}
