import { ImageRightsStatus, Prisma, PrismaClient } from '@prisma/client';
import {
  CatalogueImportResult,
  CatalogueItem,
  CatalogueSnapshot,
  MET_FIXTURE_NAME,
  MET_PROVIDER,
} from './catalogue.types';
import { fixtureLabel, parseCatalogueSnapshot } from './catalogue-snapshot';

const DEMO_STOCK_LEVELS = [0, 2, 4, 8, 12, 16] as const;

interface ImportOptions {
  archiveOtherProviders?: boolean;
}

export class CatalogueImporter {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async importSnapshot(
    value: unknown,
    options: ImportOptions = {},
  ): Promise<CatalogueImportResult> {
    const snapshot = parseCatalogueSnapshot(value);
    const importedAt = this.now();
    const fixture = fixtureLabel(snapshot);

    return this.prisma.$transaction(
      async (transaction) => {
        let created = 0;
        let refreshed = 0;
        let archived = 0;

        if (options.archiveOtherProviders) {
          const activeImportedProducts = await transaction.product.findMany({
            where: {
              catalogueActive: true,
              sourceProvider: { not: null },
            },
            select: {
              id: true,
              sourceProvider: true,
              sourceVariantId: true,
            },
          });
          const importedKeys = new Set(
            snapshot.items.map(
              (item) => `${snapshot.provider}:${item.sourceVariantId}`,
            ),
          );
          const archivedProductIds = activeImportedProducts
            .filter(
              (product) =>
                !importedKeys.has(
                  `${product.sourceProvider}:${product.sourceVariantId}`,
                ),
            )
            .map(({ id }) => id);

          if (archivedProductIds.length > 0) {
            await transaction.cartItem.deleteMany({
              where: { productId: { in: archivedProductIds } },
            });
            const archiveResult = await transaction.product.updateMany({
              where: { id: { in: archivedProductIds } },
              data: { catalogueActive: false, stock: 0 },
            });
            archived = archiveResult.count;
          }
        }

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
              description: item.description,
              price: new Prisma.Decimal(item.demoPrice),
              stock: demoStockFor(item.sourceVariantId),
              categoryId: category.id,
            },
          });
          created += 1;
        }

        return {
          created,
          refreshed,
          archived,
          total: snapshot.items.length,
          provider: snapshot.provider,
          fixture,
        };
      },
      { maxWait: 5_000, timeout: 30_000 },
    );
  }

  async resetDemoStock(provider: string = MET_PROVIDER): Promise<number> {
    if (provider !== MET_PROVIDER) {
      throw new Error(
        'Demo stock reset is limited to the active Met catalogue',
      );
    }

    const products = await this.prisma.product.findMany({
      where: { sourceProvider: provider, catalogueActive: true },
      select: { id: true, sourceVariantId: true },
    });

    await this.prisma.$transaction(
      products.map((product) => {
        if (!product.sourceVariantId) {
          throw new Error(
            `Imported product ${product.id} has no source object ID`,
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
      variantLabel: item.variantLabel || null,
      sourcePrice: null,
      sourceCurrency: item.sourceCurrency,
      sourceAvailable: item.sourceAvailable,
      sourceUpdatedAt: new Date(item.sourceUpdatedAt),
      sourceImportedAt: importedAt,
      sourceLicense: snapshot.licenseName,
      sourceAttribution: item.sourceAttribution,
      catalogueFixture: fixture,
      catalogueActive: true,
      imageUrl: item.image.url,
      imageAlt: item.image.alt,
      imageWidth: item.image.width,
      imageHeight: item.image.height,
      imageRightsStatus: ImageRightsStatus.PERMITTED,
    };
  }
}

export function demoStockFor(sourceVariantId: string): number {
  if (!/^\d+$/.test(sourceVariantId)) {
    throw new Error('Source object ID must contain digits only');
  }
  const digitSum = [...sourceVariantId].reduce(
    (total, digit) => total + Number(digit),
    0,
  );
  return DEMO_STOCK_LEVELS[digitSum % DEMO_STOCK_LEVELS.length];
}

export function localProductName(item: CatalogueItem): string {
  const title = item.originalTitle.trim();
  const artist = item.vendor.trim();
  if (/^(landscape|cat)$/i.test(title) && artist !== 'Unidentified artist') {
    return `${title} by ${artist}`;
  }
  return title;
}

export const catalogueFixtureName = MET_FIXTURE_NAME;
