import { prisma } from "@/lib/prisma";

type TenantId = string;

function ensureTenantId(tenantId: string) {
  if (!tenantId) {
    throw new Error("tenantId_required");
  }
  return tenantId;
}

function addTenantWhere<T extends Record<string, unknown> | undefined>(tenantId: string, where: T) {
  if (!where) return { tenantId };
  return { AND: [where, { tenantId }] };
}

function addTenantToData(tenantId: string, data: any) {
  if (Array.isArray(data)) {
    return data.map((row) => ({ ...row, tenantId }));
  }
  return { ...data, tenantId };
}

function tenantScopedClient(tenantId: TenantId) {
  const scopedTenantId = ensureTenantId(tenantId);

  const tenantQuery = {
    async $allOperations({ operation, args, query }: any) {
      if (operation === "create") {
        args.data = addTenantToData(scopedTenantId, args.data);
        return query(args);
      }

      if (operation === "createMany") {
        args.data = addTenantToData(scopedTenantId, args.data);
        return query(args);
      }

      if (operation === "findMany" || operation === "findFirst" || operation === "count" || operation === "aggregate" || operation === "groupBy") {
        args.where = addTenantWhere(scopedTenantId, args.where);
        return query(args);
      }

      if (operation === "updateMany" || operation === "deleteMany") {
        args.where = addTenantWhere(scopedTenantId, args.where);
        return query(args);
      }

      if (operation === "findUnique" || operation === "update" || operation === "delete" || operation === "upsert") {
        throw new Error(`tenantDb_forbidden_operation:${operation}`);
      }

      return query(args);
    },
  };

  return prisma.$extends({
    query: {
      item: tenantQuery,
      itemGroup: tenantQuery,
      method: tenantQuery,
      unit: tenantQuery,
      printerConfig: tenantQuery,
      user: tenantQuery,
      labelPrint: tenantQuery,
    },
  });
}

export function tenantDb(tenantId: TenantId) {
  return tenantScopedClient(tenantId);
}
