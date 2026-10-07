import { ImageRightsStatus } from '@prisma/client';
import {
  CatalogueImage,
  CatalogueItem,
  CatalogueSnapshot,
  GOODSMILE_COLLECTION_URL,
  GOODSMILE_CURRENCY_URL,
  GOODSMILE_FEED_URL,
  GOODSMILE_PROVIDER,
} from './catalogue.types';
import { parseCatalogueSnapshot } from './catalogue-snapshot';

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 5_000_000;
const MAX_SOURCE_PRODUCTS = 100;

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export async function fetchGoodSmileSnapshot(
  curatedVariantIds: string[],
  fetcher: FetchLike = fetch,
  now: () => Date = () => new Date(),
): Promise<CatalogueSnapshot> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const [feed, currencyResponse] = await Promise.all([
      fetchJson(GOODSMILE_FEED_URL, controller.signal, fetcher),
      fetchJson(GOODSMILE_CURRENCY_URL, controller.signal, fetcher),
    ]);
    const currency = readCurrency(currencyResponse);
    return normalizeGoodSmileFeed(
      feed,
      currency,
      curatedVariantIds,
      now().toISOString(),
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeGoodSmileFeed(
  value: unknown,
  currency: string,
  curatedVariantIds: string[],
  capturedAt: string,
): CatalogueSnapshot {
  if (currency !== 'USD') {
    throw new Error(
      `Expected Good Smile US currency USD, received ${currency}`,
    );
  }
  if (curatedVariantIds.length === 0 || curatedVariantIds.length > 30) {
    throw new Error(
      'Curated variant selection must contain between 1 and 30 IDs',
    );
  }

  const feed = asRecord(value, 'Good Smile feed');
  const products = requiredArray(feed.products, 'Good Smile products');
  if (products.length > MAX_SOURCE_PRODUCTS) {
    throw new Error('Good Smile feed exceeded the bounded product limit');
  }

  const selectedIds = new Set(curatedVariantIds);
  if (selectedIds.size !== curatedVariantIds.length) {
    throw new Error('Curated variant selection contains duplicate IDs');
  }

  const items: CatalogueItem[] = [];
  for (const productValue of products) {
    const product = asRecord(productValue, 'Good Smile product');
    const productId = sourceId(product.id, 'Good Smile product ID');
    const variants = requiredArray(
      product.variants,
      `Good Smile product ${productId} variants`,
    );

    for (const variantValue of variants) {
      const variant = asRecord(
        variantValue,
        `Good Smile product ${productId} variant`,
      );
      const variantId = sourceId(variant.id, 'Good Smile variant ID');
      if (!selectedIds.has(variantId)) {
        continue;
      }
      if (items.some((item) => item.sourceVariantId === variantId)) {
        throw new Error(`Good Smile feed repeated variant ${variantId}`);
      }

      items.push(
        normalizeItem(product, variant, productId, variantId, currency),
      );
    }
  }

  const foundIds = new Set(items.map((item) => item.sourceVariantId));
  const missingIds = curatedVariantIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    throw new Error(
      `Good Smile feed is missing curated variants: ${missingIds.join(', ')}`,
    );
  }

  return parseCatalogueSnapshot({
    schemaVersion: 1,
    provider: GOODSMILE_PROVIDER,
    collectionUrl: GOODSMILE_COLLECTION_URL,
    feedUrl: GOODSMILE_FEED_URL,
    currency,
    capturedAt,
    imageRightsStatus: ImageRightsStatus.UNVERIFIED,
    items,
  });
}

export function plainTextFromHtml(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return decodeHtmlEntities(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
}

export function normalizeCategory(productType: string): string {
  const type = productType.toLowerCase();
  if (type.includes('plush')) return 'Plush';
  if (type.includes('nendoroid')) return 'Nendoroids';
  if (type.includes('scale')) return 'Scale Figures';
  if (type.includes('figma') || type.includes('action figure')) {
    return 'Action Figures';
  }
  if (type.includes('model kit')) return 'Model Kits';
  if (type.includes('shirt')) return 'Apparel';
  if (type.includes('bag')) return 'Accessories';
  if (type.includes('pop up parade')) return 'POP UP PARADE';
  return 'Collectibles';
}

async function fetchJson(
  url: string,
  signal: AbortSignal,
  fetcher: FetchLike,
): Promise<unknown> {
  const response = await fetcher(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Good Smile request failed with HTTP ${response.status}`);
  }

  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error('Good Smile response exceeded the size limit');
  }
  const body = await response.text();
  if (Buffer.byteLength(body, 'utf8') > MAX_RESPONSE_BYTES) {
    throw new Error('Good Smile response exceeded the size limit');
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error('Good Smile returned invalid JSON');
  }
}

function readCurrency(value: unknown): string {
  const response = asRecord(value, 'Good Smile currency response');
  if (typeof response.currency !== 'string') {
    throw new Error('Good Smile currency response is missing currency');
  }
  return response.currency.trim().toUpperCase();
}

function normalizeItem(
  product: Record<string, unknown>,
  variant: Record<string, unknown>,
  productId: string,
  variantId: string,
  currency: string,
): CatalogueItem {
  const title = requiredString(product.title, 'Good Smile product title', 240);
  const handle = requiredString(
    product.handle,
    'Good Smile product handle',
    240,
  );
  const productType = requiredString(
    product.product_type,
    'Good Smile product type',
    100,
  );
  const variantLabel = requiredString(
    variant.title,
    'Good Smile variant title',
    160,
  );
  const updatedAt = requiredDate(
    variant.updated_at ?? product.updated_at,
    'Good Smile variant updated_at',
  );

  return {
    sourceProductId: productId,
    sourceVariantId: variantId,
    sourceUrl: `https://www.goodsmileus.com/products/${handle}`,
    originalTitle: title,
    vendor: requiredString(product.vendor, 'Good Smile vendor', 160),
    sourceCategory: normalizeCategory(productType),
    sourceProductType: productType,
    variantLabel,
    sku: optionalString(variant.sku, 100),
    description: plainTextFromHtml(product.body_html),
    sourcePrice: requiredPrice(variant.price),
    sourceCurrency: currency,
    sourceAvailable: requiredBoolean(
      variant.available,
      'Good Smile variant availability',
    ),
    sourceUpdatedAt: updatedAt,
    image: normalizeImage(product, variant, title),
  };
}

function normalizeImage(
  product: Record<string, unknown>,
  variant: Record<string, unknown>,
  fallbackAlt: string,
): CatalogueImage | null {
  const productImages = Array.isArray(product.images) ? product.images : [];
  const imageValue = variant.featured_image ?? productImages[0];
  if (typeof imageValue !== 'object' || imageValue === null) {
    return null;
  }

  const image = imageValue as Record<string, unknown>;
  if (typeof image.src !== 'string') {
    return null;
  }
  let imageUrl: URL;
  try {
    imageUrl = new URL(image.src);
  } catch {
    return null;
  }
  if (imageUrl.protocol !== 'https:') {
    return null;
  }

  return {
    url: imageUrl.toString(),
    alt: optionalString(image.alt, 240) || fallbackAlt,
    width: positiveIntegerOrNull(image.width),
    height: positiveIntegerOrNull(image.height),
    rightsStatus: ImageRightsStatus.UNVERIFIED,
  };
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };
  return value.replace(
    /&(#\d+|#x[\da-f]+|[a-z]+);/gi,
    (entity, token: string) => {
      if (token.startsWith('#x')) {
        return String.fromCodePoint(Number.parseInt(token.slice(2), 16));
      }
      if (token.startsWith('#')) {
        return String.fromCodePoint(Number.parseInt(token.slice(1), 10));
      }
      return namedEntities[token.toLowerCase()] ?? entity;
    },
  );
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

function sourceId(value: unknown, label: string): string {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    !/^\d+$/.test(String(value))
  ) {
    throw new Error(`${label} must contain digits only`);
  }
  return String(value);
}

function requiredString(
  value: unknown,
  label: string,
  maxLength: number,
): string {
  const text = optionalString(value, maxLength);
  if (!text) {
    throw new Error(`${label} is required`);
  }
  return text;
}

function optionalString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function requiredPrice(value: unknown): string {
  const price = requiredString(value, 'Good Smile variant price', 30);
  if (!/^\d+(\.\d{1,2})?$/.test(price)) {
    throw new Error('Good Smile variant price is invalid');
  }
  return price;
}

function requiredDate(value: unknown, label: string): string {
  const date = requiredString(value, label, 50);
  if (Number.isNaN(Date.parse(date))) {
    throw new Error(`${label} must be an ISO date`);
  }
  return date;
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}

function positiveIntegerOrNull(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : null;
}
