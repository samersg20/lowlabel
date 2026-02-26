import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { tenantDb } from "@/lib/tenant-db";
import { withRlsBypassTx } from "@/lib/tenant-tx";

type TestEntities = {
  tenantId: string;
  userId: string;
  groupId: string;
  itemId: string;
  unitId: string;
  printerId: string;
  printId: string;
};

async function createTenantFixture(label: string): Promise<TestEntities> {
  const suffix = randomUUID().slice(0, 8);
  const email = `${label}.${suffix}@example.local`;
  const unitName = `${label}-UNIT-${suffix}`;
  const groupName = `${label}-GROUP-${suffix}`;
  const itemName = `${label}-ITEM-${suffix}`;
  const itemCode = `${label}-${suffix}-${Date.now()}`;

  const cnpjSeed = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 14);
  const created = await withRlsBypassTx(async ({ tx }) => {
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

    return { tenant, user, unit, group, item, printer, print };
  });

  return {
    tenantId: created.tenant.id,
    userId: created.user.id,
    groupId: created.group.id,
    itemId: created.item.id,
    unitId: created.unit.id,
    printerId: created.printer.id,
    printId: created.print.id,
  };
}

async function cleanupFixture(tenantId: string) {
  await withRlsBypassTx(async ({ tx }) => {
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
    const dbA = tenantDb(a.tenantId);
    const dbB = tenantDb(b.tenantId);

    assert.ok(await dbA.item.findFirst({ where: { id: a.itemId } }), "Tenant A should read its item");
    assert.equal(await dbB.item.findFirst({ where: { id: a.itemId } }), null, "Tenant B must not read tenant A item");

    assert.ok(await dbA.itemGroup.findFirst({ where: { id: a.groupId } }), "Tenant A should read its group");
    assert.equal(await dbB.itemGroup.findFirst({ where: { id: a.groupId } }), null, "Tenant B must not read tenant A group");

    assert.ok(await dbA.printerConfig.findFirst({ where: { id: a.printerId } }), "Tenant A should read its printer");
    assert.equal(await dbB.printerConfig.findFirst({ where: { id: a.printerId } }), null, "Tenant B must not read tenant A printer");

    assert.ok(await dbA.unit.findFirst({ where: { id: a.unitId } }), "Tenant A should read its unit");
    assert.equal(await dbB.unit.findFirst({ where: { id: a.unitId } }), null, "Tenant B must not read tenant A unit");

    assert.ok(await dbA.user.findFirst({ where: { id: a.userId } }), "Tenant A should read its user");
    assert.equal(await dbB.user.findFirst({ where: { id: a.userId } }), null, "Tenant B must not read tenant A user");

    const printsB = await dbB.labelPrint.findMany({ where: { id: a.printId } });
    assert.equal(printsB.length, 0, "Tenant B must not read tenant A prints");

    const updateItem = await dbB.item.updateMany({ where: { id: a.itemId }, data: { name: "HACKED" } });
    assert.equal(updateItem.count, 0, "Tenant B must not update tenant A item");

    const updateGroup = await dbB.itemGroup.updateMany({ where: { id: a.groupId }, data: { name: "HACKED" } });
    assert.equal(updateGroup.count, 0, "Tenant B must not update tenant A group");

    const updateUnit = await dbB.unit.updateMany({ where: { id: a.unitId }, data: { name: "HACKED" } });
    assert.equal(updateUnit.count, 0, "Tenant B must not update tenant A unit");

    const updatePrinter = await dbB.printerConfig.updateMany({ where: { id: a.printerId }, data: { name: "HACKED" } });
    assert.equal(updatePrinter.count, 0, "Tenant B must not update tenant A printer");

    const updateUser = await dbB.user.updateMany({ where: { id: a.userId }, data: { name: "HACKED" } });
    assert.equal(updateUser.count, 0, "Tenant B must not update tenant A user");

    assert.equal(await dbA.item.count(), 1, "Tenant A should see 1 item");
    assert.equal(await dbB.item.count(), 1, "Tenant B should see 1 item");
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
