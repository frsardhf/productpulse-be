import { ImageRightsStatus } from '@prisma/client';
import { loadCatalogueFixture } from './catalogue-snapshot';
import {
  fetchGoodSmileSnapshot,
  normalizeGoodSmileFeed,
  plainTextFromHtml,
} from './goodsmile-source';

describe('Good Smile catalogue source', () => {
  it('normalizes distinct variants with explicit USD source metadata', () => {
    const snapshot = normalizeGoodSmileFeed(
      sourceFeed(),
      'USD',
      ['2001', '2002'],
      '2026-10-07T00:00:00.000Z',
    );

    expect(snapshot.items).toHaveLength(2);
    expect(snapshot.items.map((item) => item.sourceVariantId)).toEqual([
      '2001',
      '2002',
    ]);
    expect(snapshot.items.map((item) => item.variantLabel)).toEqual([
      'Kaho',
      'Chise',
    ]);
    expect(snapshot.items[0]).toMatchObject({
      sourceProductId: '1001',
      sourceCategory: 'Plush',
      sourceCurrency: 'USD',
      sourcePrice: '29.99',
      image: {
        rightsStatus: ImageRightsStatus.UNVERIFIED,
      },
    });
    expect(snapshot.items[0].description).toBe('Cute & safe description.');
  });

  it('drops malformed image metadata instead of exposing an unsafe URL', () => {
    const feed = sourceFeed();
    feed.products[0].variants[0].featured_image.src = 'javascript:alert(1)';

    const snapshot = normalizeGoodSmileFeed(
      feed,
      'USD',
      ['2001'],
      '2026-10-07T00:00:00.000Z',
    );

    expect(snapshot.items[0].image).toBeNull();
  });

  it('rejects currency changes and missing curated variants', () => {
    expect(() =>
      normalizeGoodSmileFeed(
        sourceFeed(),
        'CAD',
        ['2001'],
        '2026-10-07T00:00:00.000Z',
      ),
    ).toThrow('Expected Good Smile US currency USD');
    expect(() =>
      normalizeGoodSmileFeed(
        sourceFeed(),
        'USD',
        ['9999'],
        '2026-10-07T00:00:00.000Z',
      ),
    ).toThrow('missing curated variants: 9999');
  });

  it('reports upstream HTTP failures without producing a snapshot', async () => {
    const unavailableFetch = jest.fn(
      async () => new Response('unavailable', { status: 503 }),
    );

    await expect(
      fetchGoodSmileSnapshot(['2001'], unavailableFetch),
    ).rejects.toThrow('Good Smile request failed with HTTP 503');
  });

  it('loads the bounded versioned fixture with genuine variant identities', async () => {
    const fixture = await loadCatalogueFixture();
    const variantIds = fixture.items.map((item) => item.sourceVariantId);

    expect(fixture.provider).toBe('goodsmile-us');
    expect(fixture.currency).toBe('USD');
    expect(fixture.imageRightsStatus).toBe(ImageRightsStatus.UNVERIFIED);
    expect(fixture.items).toHaveLength(24);
    expect(new Set(variantIds)).toHaveProperty('size', 24);
    expect(
      fixture.items.some((item) => item.variantLabel !== 'Default Title'),
    ).toBe(true);
  });

  it('removes scripts, tags and encoded entities from source descriptions', () => {
    expect(
      plainTextFromHtml(
        '<style>.bad{}</style><p>Hello&nbsp;<strong>Sensei</strong> &amp; friends</p><script>alert(1)</script>',
      ),
    ).toBe('Hello Sensei & friends');
  });
});

function sourceFeed() {
  return {
    products: [
      {
        id: 1001,
        title: 'Blue Archive - Chocopuni Plushie Kaho/Chise',
        handle: 'chocopuni-plushie-kaho-chise',
        vendor: 'Good Smile Company',
        product_type: 'Plush',
        body_html:
          '<p>Cute &amp; safe description.</p><script>unsafe()</script>',
        updated_at: '2026-10-07T00:00:00.000Z',
        images: [],
        variants: [sourceVariant(2001, 'Kaho'), sourceVariant(2002, 'Chise')],
      },
    ],
  };
}

function sourceVariant(id: number, title: string) {
  return {
    id,
    title,
    sku: `SKU-${id}`,
    price: '29.99',
    available: true,
    updated_at: '2026-10-07T00:00:00.000Z',
    featured_image: {
      src: `https://cdn.shopify.com/${id}.jpg`,
      alt: title,
      width: 750,
      height: 1000,
    },
  };
}
