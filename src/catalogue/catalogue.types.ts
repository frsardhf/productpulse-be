import { ImageRightsStatus } from '@prisma/client';

export const GOODSMILE_PROVIDER = 'goodsmile-us';
export const GOODSMILE_COLLECTION_URL =
  'https://www.goodsmileus.com/collections/blue-archive';
export const GOODSMILE_FEED_URL = `${GOODSMILE_COLLECTION_URL}/products.json?limit=100`;
export const GOODSMILE_CURRENCY_URL = 'https://www.goodsmileus.com/cart.js';
export const GOODSMILE_FIXTURE_NAME = 'goodsmile-blue-archive.v1';

export interface CatalogueImage {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  rightsStatus: ImageRightsStatus;
}

export interface CatalogueItem {
  sourceProductId: string;
  sourceVariantId: string;
  sourceUrl: string;
  originalTitle: string;
  vendor: string;
  sourceCategory: string;
  sourceProductType: string;
  variantLabel: string;
  sku: string;
  description: string;
  sourcePrice: string;
  sourceCurrency: string;
  sourceAvailable: boolean;
  sourceUpdatedAt: string;
  image: CatalogueImage | null;
}

export interface CatalogueSnapshot {
  schemaVersion: 1;
  provider: typeof GOODSMILE_PROVIDER;
  collectionUrl: string;
  feedUrl: string;
  currency: string;
  capturedAt: string;
  imageRightsStatus: ImageRightsStatus;
  items: CatalogueItem[];
}

export interface CatalogueImportResult {
  created: number;
  refreshed: number;
  total: number;
  provider: string;
  fixture: string;
}
