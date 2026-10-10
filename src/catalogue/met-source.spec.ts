import { ImageRightsStatus } from '@prisma/client';
import { loadCatalogueFixture } from './catalogue-snapshot';
import { fetchMetSnapshot, normalizeMetObject } from './met-source';

describe('The Met catalogue source', () => {
  const curated = { objectId: 55919, category: 'Cats', demoPrice: '28.00' };
  const apiObject = {
    objectID: 55919,
    isPublicDomain: true,
    primaryImageSmall:
      'https://images.metmuseum.org/CRDImages/as/web-large/DP143321.jpg',
    objectURL: 'https://www.metmuseum.org/art/collection/search/55919',
    title: 'Teasing the Cat',
    artistDisplayName: 'Tsukioka Yoshitoshi',
    objectName: 'Print',
    objectDate: '1888',
    medium: 'Woodblock print; ink and color on paper',
  };

  it('normalizes a public-domain object with CC0-ready image metadata', () => {
    const item = normalizeMetObject(
      apiObject,
      curated,
      '2026-10-10T00:00:00.000Z',
    );

    expect(item).toMatchObject({
      sourceVariantId: '55919',
      sourceCategory: 'Cats',
      sourceCurrency: 'USD',
      demoPrice: '28.00',
      sourceAttribution: expect.stringContaining('Open Access (CC0)'),
      image: { rightsStatus: ImageRightsStatus.PERMITTED },
    });
  });

  it('rejects non-public-domain objects and unexpected image hosts', () => {
    expect(() =>
      normalizeMetObject(
        { ...apiObject, isPublicDomain: false },
        curated,
        '2026-10-10T00:00:00.000Z',
      ),
    ).toThrow('not public domain');
    expect(() =>
      normalizeMetObject(
        { ...apiObject, primaryImageSmall: 'https://example.com/image.jpg' },
        curated,
        '2026-10-10T00:00:00.000Z',
      ),
    ).toThrow('unexpected image host');
  });

  it('reports upstream HTTP failures without producing a snapshot', async () => {
    const unavailableFetch = jest.fn(
      async () => new Response('unavailable', { status: 503 }),
    );

    await expect(fetchMetSnapshot([curated], unavailableFetch)).rejects.toThrow(
      'object 55919 failed with HTTP 503',
    );
  });

  it('loads a bounded fixture of permitted Open Access objects', async () => {
    const fixture = await loadCatalogueFixture();
    const objectIds = fixture.items.map((item) => item.sourceVariantId);

    expect(fixture.provider).toBe('met-open-access');
    expect(fixture.currency).toBe('USD');
    expect(fixture.licenseName).toBe('CC0 1.0');
    expect(fixture.imageRightsStatus).toBe(ImageRightsStatus.PERMITTED);
    expect(fixture.items).toHaveLength(24);
    expect(new Set(objectIds)).toHaveProperty('size', 24);
  });
});
