import { prisma } from "@/lib/prisma";

type TenantId = string;

const TENANT_MODELS = new Set([
  "User",
  "Item",
  "ItemAlias",
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

function applyTenantToArgs(tenantId: string, model: string, operation: string, args: any) {
  if (TENANT_MODELS.has(model)) {
    if (operation === "create" || operation === "createMany") {
      args.data = addTenantToData(tenantId, args.data);
    }
    if (operation === "findMany" || operation === "findFirst" || operation === "count" || operation === "aggregate" || operation === "groupBy") {
      args.where = addTenantWhere(tenantId, args.where);
    }
    if (operation === "updateMany" || operation === "deleteMany") {
      args.where = addTenantWhere(tenantId, args.where);
    }
    return args;
  }

  if (TENANT_BY_ID_MODELS.has(model)) {
    if (operation === "findMany" || operation === "findFirst" || operation === "count" || operation === "aggregate" || operation === "groupBy") {
      args.where = addTenantIdWhere(tenantId, args.where);
    }
    if (operation === "updateMany" || operation === "deleteMany") {
      args.where = addTenantIdWhere(tenantId, args.where);
    }
    return args;
  }

  throw new Error(`tenantDb_forbidden_model:${model}`);
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

        const nextArgs = applyTenantToArgs(scopedTenantId, model, operation, args);
        const [, result] = await prisma.$transaction([
          prisma.$executeRaw`select set_config('app.tenant_id', ${scopedTenantId}, true)`,
          query(nextArgs),
        ]);
        return result;
      },
    },
  });
}

export function tenantDb(tenantId: TenantId) {
  return tenantScopedClient(tenantId);
}

export function tenantDbFromTx(tx: any, tenantId: TenantId) {
  const scopedTenantId = ensureTenantId(tenantId);

  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== "string") return undefined;
        if (!tx[prop]) return undefined;
        return new Proxy(tx[prop], {
          get(delegateTarget, op) {
            if (typeof op !== "string") return undefined;
            if (FORBIDDEN_OPERATIONS.has(op)) {
              return () => {
                throw new Error(`tenantDb_forbidden_operation:${op}`);
              };
            }
            if (typeof (delegateTarget as any)[op] !== "function") return undefined;
            return (args: any = {}) => {
              const nextArgs = applyTenantToArgs(scopedTenantId, prop.charAt(0).toUpperCase() + prop.slice(1), op, { ...args });
              return (delegateTarget as any)[op](nextArgs);
            };
          },
        });
      },
    },
  ) as any;
}
