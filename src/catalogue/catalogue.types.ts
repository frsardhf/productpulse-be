import { ImageRightsStatus } from '@prisma/client';

export const MET_PROVIDER = 'met-open-access';
export const MET_COLLECTION_URL = 'https://www.metmuseum.org/art/collection';
export const MET_API_BASE_URL =
  'https://collectionapi.metmuseum.org/public/collection/v1';
export const MET_FIXTURE_NAME = 'met-open-access-prints.v1';
export const MET_LICENSE_NAME = 'CC0 1.0';
export const MET_LICENSE_URL =
  'https://creativecommons.org/publicdomain/zero/1.0/';

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
  demoPrice: string;
  sourceCurrency: string;
  sourceAvailable: boolean;
  sourceUpdatedAt: string;
  sourceAttribution: string;
  image: CatalogueImage;
}

export interface CatalogueSnapshot {
  schemaVersion: 2;
  provider: typeof MET_PROVIDER;
  collectionUrl: string;
  feedUrl: string;
  currency: string;
  capturedAt: string;
  imageRightsStatus: ImageRightsStatus;
  licenseName: string;
  licenseUrl: string;
  items: CatalogueItem[];
}

export interface CatalogueImportResult {
  created: number;
  refreshed: number;
  archived: number;
  total: number;
  provider: string;
  fixture: string;
}

export interface CuratedMetObject {
  objectId: number;
  category: string;
  demoPrice: string;
}
