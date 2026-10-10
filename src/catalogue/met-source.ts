import { ImageRightsStatus } from '@prisma/client';
import {
  CatalogueItem,
  CatalogueSnapshot,
  CuratedMetObject,
  MET_API_BASE_URL,
  MET_COLLECTION_URL,
  MET_LICENSE_NAME,
  MET_LICENSE_URL,
  MET_PROVIDER,
} from './catalogue.types';

export const MET_CURATED_OBJECTS: readonly CuratedMetObject[] = [
  ...[
    55919, 53653, 54626, 36075, 57204, 56602, 54747, 49470, 911913, 53222,
    50826, 49050, 49467, 45282,
  ].map((objectId, index) => ({
    objectId,
    category: 'Cats',
    demoPrice: `${28 + index}.00`,
  })),
  ...[45072, 44895, 45070, 48968, 51498, 40426, 51502, 51503, 51552, 51624].map(
    (objectId, index) => ({
      objectId,
      category: 'Landscapes',
      demoPrice: `${36 + index}.00`,
    }),
  ),
];

interface MetApiObject {
  objectID?: unknown;
  isPublicDomain?: unknown;
  primaryImageSmall?: unknown;
  objectURL?: unknown;
  title?: unknown;
  artistDisplayName?: unknown;
  objectName?: unknown;
  objectDate?: unknown;
  medium?: unknown;
}

export async function fetchMetSnapshot(
  curated: readonly CuratedMetObject[] = MET_CURATED_OBJECTS,
  fetchImpl: typeof fetch = fetch,
): Promise<CatalogueSnapshot> {
  const capturedAt = new Date().toISOString();
  const items: CatalogueItem[] = [];

  // This is intentionally sequential: the set is small and the API is public.
  for (const entry of curated) {
    const response = await fetchImpl(
      `${MET_API_BASE_URL}/objects/${entry.objectId}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!response.ok) {
      throw new Error(
        `The Met request for object ${entry.objectId} failed with HTTP ${response.status}`,
      );
    }
    const object = (await response.json()) as MetApiObject;
    items.push(normalizeMetObject(object, entry, capturedAt));
  }

  return {
    schemaVersion: 2,
    provider: MET_PROVIDER,
    collectionUrl: MET_COLLECTION_URL,
    feedUrl: `${MET_API_BASE_URL}/objects`,
    currency: 'USD',
    capturedAt,
    imageRightsStatus: ImageRightsStatus.PERMITTED,
    licenseName: MET_LICENSE_NAME,
    licenseUrl: MET_LICENSE_URL,
    items,
  };
}

export function normalizeMetObject(
  value: MetApiObject,
  curated: CuratedMetObject,
  capturedAt: string,
): CatalogueItem {
  if (value.objectID !== curated.objectId) {
    throw new Error(
      `The Met returned the wrong object for ${curated.objectId}`,
    );
  }
  if (value.isPublicDomain !== true) {
    throw new Error(`The Met object ${curated.objectId} is not public domain`);
  }

  const imageUrl = requiredUrl(value.primaryImageSmall, 'image');
  if (new URL(imageUrl).hostname !== 'images.metmuseum.org') {
    throw new Error(
      `The Met object ${curated.objectId} uses an unexpected image host`,
    );
  }
  const sourceUrl = requiredUrl(value.objectURL, 'source');
  const originalTitle = requiredText(value.title, 'title');
  const vendor = optionalText(value.artistDisplayName) || 'Unidentified artist';
  const sourceProductType = optionalText(value.objectName) || 'Artwork';
  const date = optionalText(value.objectDate) || 'date unknown';
  const medium = optionalText(value.medium) || sourceProductType;

  return {
    sourceProductId: String(curated.objectId),
    sourceVariantId: String(curated.objectId),
    sourceUrl,
    originalTitle,
    vendor,
    sourceCategory: curated.category,
    sourceProductType,
    variantLabel: '',
    sku: `MET-${curated.objectId}`,
    description: `${originalTitle}, ${date}, by ${vendor}. Original medium: ${medium}.`,
    demoPrice: curated.demoPrice,
    sourceCurrency: 'USD',
    sourceAvailable: true,
    sourceUpdatedAt: capturedAt,
    sourceAttribution: `${originalTitle} by ${vendor}. The Metropolitan Museum of Art, Open Access (CC0).`,
    image: {
      url: imageUrl,
      alt: `${originalTitle} by ${vendor}`,
      width: null,
      height: null,
      rightsStatus: ImageRightsStatus.PERMITTED,
    },
  };
}

function requiredUrl(value: unknown, label: string): string {
  const text = requiredText(value, label);
  const url = new URL(text);
  if (url.protocol !== 'https:') {
    throw new Error(`The Met ${label} URL must use HTTPS`);
  }
  return url.toString();
}

function requiredText(value: unknown, label: string): string {
  const text = optionalText(value);
  if (!text) {
    throw new Error(`The Met object ${label} is required`);
  }
  return text;
}

function optionalText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
