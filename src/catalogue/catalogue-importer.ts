import { ImageRightsStatus, Prisma, PrismaClient } from '@prisma/client';
import {
  CatalogueImportResult,
  CatalogueItem,
  CatalogueSnapshot,
  GOODSMILE_FIXTURE_NAME,
  GOODSMILE_PROVIDER,
} from './catalogue.types';
import { fixtureLabel, parseCatalogueSnapshot } from './catalogue-snapshot';

const DEMO_STOCK_LEVELS = [0, 2, 4, 8, 12, 16] as const;

export class CatalogueImporter {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async importSnapshot(value: unknown): Promise<CatalogueImportResult> {
    const snapshot = parseCatalogueSnapshot(value);
    const importedAt = this.now();
    const fixture = fixtureLabel(snapshot);

    return this.prisma.$transaction(
      async (transaction) => {
        let created = 0;
        let refreshed = 0;

        for (const item of snapshot.items) {
          const existing = await transaction.product.findUnique({
            where: {
              sourceProvider_sourceVariantId: {
                sourceProvider: snapshot.provider,
                sourceVariantId: item.sourceVariantId,
              },
            },
            select: { id: true },
          });
          const sourceData = this.sourceData(
            snapshot,
            item,
            fixture,
            importedAt,
          );

          if (existing) {
            await transaction.product.update({
              where: { id: existing.id },
              data: sourceData,
            });
            refreshed += 1;
            continue;
          }

          const category = await transaction.category.upsert({
            where: { name: item.sourceCategory },
            update: {},
            create: { name: item.sourceCategory },
          });
          await transaction.product.create({
            data: {
              ...sourceData,
              name: localProductName(item),
              description: item.description || item.originalTitle,
              price: new Prisma.Decimal(item.sourcePrice),
              stock: demoStockFor(item.sourceVariantId),
              categoryId: category.id,
            },
          });
          created += 1;
        }

        return {
          created,
          refreshed,
          total: snapshot.items.length,
          provider: snapshot.provider,
          fixture,
        };
      },
      { maxWait: 5_000, timeout: 30_000 },
    );
  }

  async resetDemoStock(provider: string = GOODSMILE_PROVIDER): Promise<number> {
    if (provider !== GOODSMILE_PROVIDER) {
      throw new Error(
        'Demo stock reset is limited to the Good Smile US catalogue',
      );
    }

    const products = await this.prisma.product.findMany({
      where: { sourceProvider: provider },
      select: { id: true, sourceVariantId: true },
    });

    await this.prisma.$transaction(
      products.map((product) => {
        if (!product.sourceVariantId) {
          throw new Error(
            `Imported product ${product.id} has no source variant ID`,
          );
        }
        return this.prisma.product.update({
          where: { id: product.id },
          data: { stock: demoStockFor(product.sourceVariantId) },
        });
      }),
    );

    return products.length;
  }

  private sourceData(
    snapshot: CatalogueSnapshot,
    item: CatalogueItem,
    fixture: string,
    importedAt: Date,
  ) {
    return {
      sourceProvider: snapshot.provider,
      sourceProductId: item.sourceProductId,
      sourceVariantId: item.sourceVariantId,
      sourceUrl: item.sourceUrl,
      sourceTitle: item.originalTitle,
      sourceVendor: item.vendor,
      sourceCategory: item.sourceCategory,
      sourceProductType: item.sourceProductType,
      sourceSku: item.sku || null,
      variantLabel:
        item.variantLabel === 'Default Title' ? null : item.variantLabel,
      sourcePrice: new Prisma.Decimal(item.sourcePrice),
      sourceCurrency: item.sourceCurrency,
      sourceAvailable: item.sourceAvailable,
      sourceUpdatedAt: new Date(item.sourceUpdatedAt),
      sourceImportedAt: importedAt,
      catalogueFixture: fixture,
      imageUrl: item.image?.url ?? null,
      imageAlt: item.image?.alt || null,
      imageWidth: item.image?.width ?? null,
      imageHeight: item.image?.height ?? null,
      imageRightsStatus:
        item.image?.rightsStatus ?? ImageRightsStatus.PLACEHOLDER_ONLY,
    };
  }
}

export function demoStockFor(sourceVariantId: string): number {
  if (!/^\d+$/.test(sourceVariantId)) {
    throw new Error('Source variant ID must contain digits only');
  }
  const digitSum = [...sourceVariantId].reduce(
    (total, digit) => total + Number(digit),
    0,
  );
  const index = digitSum % DEMO_STOCK_LEVELS.length;
  return DEMO_STOCK_LEVELS[index];
}

export function localProductName(item: CatalogueItem): string {
  const baseName = item.originalTitle
    .replace(/^Blue Archive\s*-\s*/i, '')
    .trim();
  if (!item.variantLabel || item.variantLabel === 'Default Title') {
    return baseName;
  }
  return `${baseName}: ${item.variantLabel}`;
}

export const catalogueFixtureName = GOODSMILE_FIXTURE_NAME;
