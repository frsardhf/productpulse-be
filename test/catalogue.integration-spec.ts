import { ImageRightsStatus, Prisma } from '@prisma/client';
import {
  CatalogueImporter,
  demoStockFor,
} from '../src/catalogue/catalogue-importer';
import { loadCatalogueFixture } from '../src/catalogue/catalogue-snapshot';
import { PrismaService } from '../src/prisma.service';

describe('Catalogue import integration', () => {
  const prisma = new PrismaService();
  const importedAt = new Date('2026-10-07T17:00:00.000Z');
  const importer = new CatalogueImporter(prisma, () => importedAt);

  beforeAll(async () => {
    const databaseUrl = new URL(process.env.POSTGRES_PRISMA_URL ?? '');
    if (databaseUrl.pathname !== '/productpulse_integration') {
      throw new Error(
        'Integration tests require the dedicated productpulse_integration database',
      );
    }
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('imports 24 distinct variants with deterministic demo inventory', async () => {
    const fixture = await loadCatalogueFixture();
    const result = await importer.importSnapshot(fixture);

    expect(result).toMatchObject({
      created: 24,
      refreshed: 0,
      archived: 0,
      total: 24,
    });
    await expect(prisma.product.count()).resolves.toBe(24);
    await expect(prisma.category.count()).resolves.toBe(2);

    const products = await prisma.product.findMany({
      orderBy: { sourceVariantId: 'asc' },
    });
    expect(
      new Set(products.map((product) => product.sourceVariantId)).size,
    ).toBe(24);
    expect(products.every((product) => product.sourceCurrency === 'USD')).toBe(
      true,
    );
    expect(
      products.every(
        (product) => product.imageRightsStatus === ImageRightsStatus.PERMITTED,
      ),
    ).toBe(true);
    expect(
      products.every((product) => product.sourceLicense === 'CC0 1.0'),
    ).toBe(true);
    expect(products.every((product) => product.catalogueActive)).toBe(true);
    expect(products.some((product) => product.stock === 0)).toBe(true);
    expect(products.some((product) => product.stock === 2)).toBe(true);
    expect(products.some((product) => product.stock >= 8)).toBe(true);
  });

  it('refreshes source metadata without overwriting local admin edits', async () => {
    const fixture = await loadCatalogueFixture();
    await importer.importSnapshot(fixture);
    const original = await prisma.product.findFirstOrThrow({
      where: { sourceProvider: fixture.provider },
      orderBy: { id: 'asc' },
    });
    const customCategory = await prisma.category.create({
      data: { name: 'Admin Curated' },
    });
    await prisma.product.update({
      where: { id: original.id },
      data: {
        name: 'Admin title',
        description: 'Admin description',
        price: new Prisma.Decimal('7.77'),
        stock: 19,
        categoryId: customCategory.id,
      },
    });

    const refreshedFixture = structuredClone(fixture);
    refreshedFixture.items[0].originalTitle = 'Updated source title';
    refreshedFixture.items[0].sourceAttribution = 'Updated attribution';
    refreshedFixture.items[0].sourceAvailable = false;
    const result = await importer.importSnapshot(refreshedFixture);
    const refreshed = await prisma.product.findUniqueOrThrow({
      where: { id: original.id },
    });

    expect(result).toMatchObject({ created: 0, refreshed: 24, total: 24 });
    expect(refreshed).toMatchObject({
      id: original.id,
      name: 'Admin title',
      description: 'Admin description',
      stock: 19,
      categoryId: customCategory.id,
      sourceTitle: 'Updated source title',
      sourceAttribution: 'Updated attribution',
      sourceAvailable: false,
      sourceImportedAt: importedAt,
    });
    expect(refreshed.price.toString()).toBe('7.77');
    expect(refreshed.sourcePrice).toBeNull();
  });

  it('rejects a malformed refresh before changing the working catalogue', async () => {
    const fixture = await loadCatalogueFixture();
    await importer.importSnapshot(fixture);
    const malformed = structuredClone(fixture) as unknown as Record<
      string,
      unknown
    >;
    malformed.currency = 'CAD';

    await expect(importer.importSnapshot(malformed)).rejects.toThrow(
      'Currency mismatch',
    );
    await expect(prisma.product.count()).resolves.toBe(24);
    await expect(
      prisma.product.count({ where: { sourceCurrency: 'USD' } }),
    ).resolves.toBe(24);
  });

  it('resets only imported demo stock with a deterministic target', async () => {
    const fixture = await loadCatalogueFixture();
    await importer.importSnapshot(fixture);
    const imported = await prisma.product.findFirstOrThrow({
      where: { sourceProvider: fixture.provider },
      orderBy: { id: 'asc' },
    });
    const localCategory = await prisma.category.create({
      data: { name: 'Local Only' },
    });
    const localProduct = await prisma.product.create({
      data: {
        name: 'Local product',
        description: 'Not managed by the catalogue importer',
        price: new Prisma.Decimal('5.00'),
        stock: 77,
        categoryId: localCategory.id,
      },
    });
    await prisma.product.update({
      where: { id: imported.id },
      data: { stock: 99 },
    });

    await expect(importer.resetDemoStock()).resolves.toBe(24);
    const resetImported = await prisma.product.findUniqueOrThrow({
      where: { id: imported.id },
    });
    const untouchedLocal = await prisma.product.findUniqueOrThrow({
      where: { id: localProduct.id },
    });

    expect(resetImported.stock).toBe(
      demoStockFor(imported.sourceVariantId as string),
    );
    expect(untouchedLocal.stock).toBe(77);
  });

  it('archives the old provider without breaking historical order items', async () => {
    const oldCategory = await prisma.category.create({
      data: { name: 'Old catalogue' },
    });
    const oldProduct = await prisma.product.create({
      data: {
        name: 'Retired product',
        description: 'Previously imported',
        price: new Prisma.Decimal('25.00'),
        stock: 5,
        categoryId: oldCategory.id,
        sourceProvider: 'goodsmile-us',
        sourceVariantId: '12345',
      },
    });
    const user = await prisma.user.create({
      data: {
        name: 'Catalogue tester',
        email: 'catalogue@example.com',
        password: 'test-hash',
      },
    });
    await prisma.cartItem.create({
      data: { userId: user.id, productId: oldProduct.id, quantity: 1 },
    });
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        productsId: [oldProduct.id],
        status: 'delivered',
        totalPrice: new Prisma.Decimal('25.00'),
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: oldProduct.id,
        quantity: 1,
        price: new Prisma.Decimal('25.00'),
        productName: oldProduct.name,
      },
    });

    const fixture = await loadCatalogueFixture();
    const result = await importer.importSnapshot(fixture, {
      archiveOtherProviders: true,
    });
    const archived = await prisma.product.findUniqueOrThrow({
      where: { id: oldProduct.id },
    });

    expect(result.archived).toBe(1);
    expect(archived).toMatchObject({ catalogueActive: false, stock: 0 });
    await expect(
      prisma.cartItem.count({ where: { productId: oldProduct.id } }),
    ).resolves.toBe(0);
    await expect(
      prisma.orderItem.count({ where: { productId: oldProduct.id } }),
    ).resolves.toBe(1);
  });
});
