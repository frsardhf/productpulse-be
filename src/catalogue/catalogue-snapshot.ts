import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ImageRightsStatus } from '@prisma/client';
import {
  CatalogueImage,
  CatalogueItem,
  CatalogueSnapshot,
  GOODSMILE_FIXTURE_NAME,
  GOODSMILE_PROVIDER,
} from './catalogue.types';

const fixturePath = resolve(
  process.cwd(),
  'src/catalogue/fixtures/goodsmile-blue-archive.v1.json',
);

export async function loadCatalogueFixture(): Promise<CatalogueSnapshot> {
  const contents = await readFile(fixturePath, 'utf8');
  return parseCatalogueSnapshot(JSON.parse(contents));
}

export function parseCatalogueSnapshot(value: unknown): CatalogueSnapshot {
  const snapshot = asRecord(value, 'Catalogue snapshot');
  if (snapshot.schemaVersion !== 1) {
    throw new Error('Unsupported catalogue snapshot version');
  }
  if (snapshot.provider !== GOODSMILE_PROVIDER) {
    throw new Error('Unsupported catalogue provider');
  }

  const currency = requiredCurrency(snapshot.currency, 'Snapshot currency');
  const capturedAt = requiredDate(snapshot.capturedAt, 'Snapshot capturedAt');
  const items = requiredArray(snapshot.items, 'Snapshot items').map(
    parseCatalogueItem,
  );
  if (items.length === 0 || items.length > 30) {
    throw new Error('Catalogue snapshot must contain between 1 and 30 items');
  }

  const variantIds = new Set<string>();
  for (const item of items) {
    if (variantIds.has(item.sourceVariantId)) {
      throw new Error(`Duplicate source variant ${item.sourceVariantId}`);
    }
    if (item.sourceCurrency !== currency) {
      throw new Error(
        `Currency mismatch for source variant ${item.sourceVariantId}`,
      );
    }
    variantIds.add(item.sourceVariantId);
  }

  return {
    schemaVersion: 1,
    provider: GOODSMILE_PROVIDER,
    collectionUrl: requiredHttpsUrl(
      snapshot.collectionUrl,
      'Snapshot collectionUrl',
    ),
    feedUrl: requiredHttpsUrl(snapshot.feedUrl, 'Snapshot feedUrl'),
    currency,
    capturedAt,
    imageRightsStatus: requiredRightsStatus(snapshot.imageRightsStatus),
    items,
  };
}

export function fixtureLabel(snapshot: CatalogueSnapshot): string {
  return `${GOODSMILE_FIXTURE_NAME}@${snapshot.capturedAt}`;
}

function parseCatalogueItem(value: unknown, index: number): CatalogueItem {
  const item = asRecord(value, `Catalogue item ${index}`);
  const sourceVariantId = requiredId(
    item.sourceVariantId,
    `Catalogue item ${index} sourceVariantId`,
  );
  const image = item.image === null ? null : parseImage(item.image, index);

  return {
    sourceProductId: requiredId(
      item.sourceProductId,
      `Catalogue item ${index} sourceProductId`,
    ),
    sourceVariantId,
    sourceUrl: requiredHttpsUrl(
      item.sourceUrl,
      `Catalogue item ${index} sourceUrl`,
    ),
    originalTitle: requiredText(
      item.originalTitle,
      `Catalogue item ${index} originalTitle`,
      240,
    ),
    vendor: requiredText(item.vendor, `Catalogue item ${index} vendor`, 160),
    sourceCategory: requiredText(
      item.sourceCategory,
      `Catalogue item ${index} sourceCategory`,
      100,
    ),
    sourceProductType: requiredText(
      item.sourceProductType,
      `Catalogue item ${index} sourceProductType`,
      100,
    ),
    variantLabel: requiredText(
      item.variantLabel,
      `Catalogue item ${index} variantLabel`,
      160,
    ),
    sku: optionalText(item.sku, 100),
    description: optionalText(item.description, 600),
    sourcePrice: requiredPrice(
      item.sourcePrice,
      `Catalogue item ${index} sourcePrice`,
    ),
    sourceCurrency: requiredCurrency(
      item.sourceCurrency,
      `Catalogue item ${index} sourceCurrency`,
    ),
    sourceAvailable: requiredBoolean(
      item.sourceAvailable,
      `Catalogue item ${index} sourceAvailable`,
    ),
    sourceUpdatedAt: requiredDate(
      item.sourceUpdatedAt,
      `Catalogue item ${index} sourceUpdatedAt`,
    ),
    image,
  };
}

function parseImage(value: unknown, itemIndex: number): CatalogueImage {
  const image = asRecord(value, `Catalogue item ${itemIndex} image`);
  return {
    url: requiredHttpsUrl(image.url, `Catalogue item ${itemIndex} image URL`),
    alt: optionalText(image.alt, 240),
    width: optionalPositiveInteger(image.width),
    height: optionalPositiveInteger(image.height),
    rightsStatus: requiredRightsStatus(image.rightsStatus),
  };
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requiredArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

function requiredText(
  value: unknown,
  label: string,
  maxLength: number,
): string {
  const text = optionalText(value, maxLength);
  if (!text) {
    throw new Error(`${label} is required`);
  }
  return text;
}

function optionalText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLength);
}

function requiredId(value: unknown, label: string): string {
  const id = requiredText(value, label, 40);
  if (!/^\d+$/.test(id)) {
    throw new Error(`${label} must contain digits only`);
  }
  return id;
}

function requiredPrice(value: unknown, label: string): string {
  const price = requiredText(value, label, 30);
  if (!/^\d+(\.\d{1,2})?$/.test(price)) {
    throw new Error(`${label} must be a non-negative decimal amount`);
  }
  return price;
}

function requiredCurrency(value: unknown, label: string): string {
  const currency = requiredText(value, label, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(`${label} must be an ISO 4217 currency code`);
  }
  return currency;
}

function requiredDate(value: unknown, label: string): string {
  const date = requiredText(value, label, 50);
  if (Number.isNaN(Date.parse(date))) {
    throw new Error(`${label} must be an ISO date`);
  }
  return date;
}

function requiredHttpsUrl(value: unknown, label: string): string {
  const url = requiredText(value, label, 2048);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`${label} must use HTTPS`);
  }
  return parsed.toString();
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}

function requiredRightsStatus(value: unknown): ImageRightsStatus {
  if (
    value !== ImageRightsStatus.UNVERIFIED &&
    value !== ImageRightsStatus.PERMITTED &&
    value !== ImageRightsStatus.PLACEHOLDER_ONLY
  ) {
    throw new Error('Invalid image rights status');
  }
  return value;
}

function optionalPositiveInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : null;
}
