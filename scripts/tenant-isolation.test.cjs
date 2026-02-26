require("dotenv/config");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;
if (!connectionString) {
  throw new Error("Missing DATABASE_URL (or DIRECT_DATABASE_URL) in env");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function withRlsBypassTx(fn) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.bypass_rls', '1', true)`;
    return fn(tx);
  });
}

async function withTenantTx(tenantId, fn) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}

async function createTenantFixture(label) {
  const suffix = randomUUID().slice(0, 8);
  const email = `${label}.${suffix}@example.local`;
  const unitName = `${label}-UNIT-${suffix}`;
  const groupName = `${label}-GROUP-${suffix}`;
  const itemName = `${label}-ITEM-${suffix}`;
  const itemCode = `${label}-${suffix}-${Date.now()}`;
  const cnpjSeed = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 14);

  return withRlsBypassTx(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        companyName: `${label} Co`,
        legalName: `${label} Ltda`,
        tradeName: `${label} Trade`,
        cnpj: cnpjSeed.padStart(14, "0"),
        businessAddress: "Rua 1",
        neighborhood: "Centro",
        city: "Sao Paulo",
        state: "SP",
        zipCode: "01000-000",
        stateRegistration: "ISENTO",
        printerLimit: 5,
        subscriptionStatus: "active",
      },
    });

    await tx.$executeRaw`select set_config('app.tenant_id', ${tenant.id}, true)`;

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: `${label} User`,
        email,
        username: email,
        passwordHash: "test-hash",
        role: "ADMIN",
        unit: unitName,
      },
    });

    const unit = await tx.unit.create({
      data: {
        tenantId: tenant.id,
        name: unitName,
        email,
        phone: "11999999999",
        managerName: `${label} Manager`,
      },
    });

    const group = await tx.itemGroup.create({
      data: {
        tenantId: tenant.id,
        name: groupName,
      },
    });

    const item = await tx.item.create({
      data: {
        tenantId: tenant.id,
        itemCode,
        name: itemName,
        type: "GERAL",
        groupId: group.id,
        methodQuente: true,
        selectedMethods: ["QUENTE"],
        preferredStorageMethod: "QUENTE",
      },
    });

    const printer = await tx.printerConfig.create({
      data: {
        tenantId: tenant.id,
        name: `${label} Printer`,
        unit: unitName,
        apiKey: "pn_test",
        printerId: 123,
        isActive: true,
        userId: user.id,
      },
    });

    const print = await tx.labelPrint.create({
      data: {
        tenantId: tenant.id,
        itemId: item.id,
        storageMethod: "QUENTE",
        producedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        userId: user.id,
        quantity: 1,
      },
    });

    return {
      tenantId: tenant.id,
      userId: user.id,
      groupId: group.id,
      itemId: item.id,
      unitId: unit.id,
      printerId: printer.id,
      printId: print.id,
    };
  });
}

async function cleanupFixture(tenantId) {
  await withRlsBypassTx(async (tx) => {
    await tx.$executeRaw`select set_config('app.tenant_id', ${tenantId}, true)`;
    await tx.labelPrint.deleteMany({ where: { tenantId } });
    await tx.printerConfig.deleteMany({ where: { tenantId } });
    await tx.item.deleteMany({ where: { tenantId } });
    await tx.itemGroup.deleteMany({ where: { tenantId } });
    await tx.unit.deleteMany({ where: { tenantId } });
    await tx.user.deleteMany({ where: { tenantId } });
    await tx.method.deleteMany({ where: { tenantId } });
    await tx.tenant.deleteMany({ where: { id: tenantId } });
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("SKIP: DATABASE_URL not set.");
    return;
  }

  const a = await createTenantFixture("TENANTA");
  const b = await createTenantFixture("TENANTB");

  try {
    await withTenantTx(a.tenantId, async (tx) => {
      assert.ok(await tx.item.findFirst({ where: { id: a.itemId, tenantId: a.tenantId } }));
      assert.equal(await tx.item.findFirst({ where: { id: b.itemId, tenantId: a.tenantId } }), null);
      assert.ok(await tx.itemGroup.findFirst({ where: { id: a.groupId, tenantId: a.tenantId } }));
      assert.equal(await tx.itemGroup.findFirst({ where: { id: b.groupId, tenantId: a.tenantId } }), null);
      assert.ok(await tx.printerConfig.findFirst({ where: { id: a.printerId, tenantId: a.tenantId } }));
      assert.equal(await tx.printerConfig.findFirst({ where: { id: b.printerId, tenantId: a.tenantId } }), null);
      assert.ok(await tx.unit.findFirst({ where: { id: a.unitId, tenantId: a.tenantId } }));
      assert.equal(await tx.unit.findFirst({ where: { id: b.unitId, tenantId: a.tenantId } }), null);
      assert.ok(await tx.user.findFirst({ where: { id: a.userId, tenantId: a.tenantId } }));
      assert.equal(await tx.user.findFirst({ where: { id: b.userId, tenantId: a.tenantId } }), null);
      const printsB = await tx.labelPrint.findMany({ where: { id: b.printId, tenantId: a.tenantId } });
      assert.equal(printsB.length, 0);
    });
  } finally {
    await cleanupFixture(a.tenantId);
    await cleanupFixture(b.tenantId);
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
