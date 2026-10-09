import { isAllowedFrontendOrigin } from './cors';

describe('frontend CORS origin policy', () => {
  const environment = {
    FRONTEND_ORIGINS:
      'https://shop.example.com, https://productpulse.pages.dev/',
    FRONTEND_PREVIEW_DOMAIN: 'productpulse.pages.dev',
  };

  it('allows configured production, legacy, and local origins', () => {
    expect(
      isAllowedFrontendOrigin('https://shop.example.com', environment),
    ).toBe(true);
    expect(
      isAllowedFrontendOrigin(
        'https://productpulse-six.vercel.app',
        environment,
      ),
    ).toBe(true);
    expect(isAllowedFrontendOrigin('http://localhost:3001', environment)).toBe(
      true,
    );
  });

  it('allows HTTPS Cloudflare Pages preview subdomains', () => {
    expect(
      isAllowedFrontendOrigin(
        'https://a1b2c3.productpulse.pages.dev',
        environment,
      ),
    ).toBe(true);
    expect(
      isAllowedFrontendOrigin(
        'https://feature-checkout.productpulse.pages.dev',
        environment,
      ),
    ).toBe(true);
  });

  it('rejects insecure, lookalike, and unrelated origins', () => {
    expect(
      isAllowedFrontendOrigin(
        'http://preview.productpulse.pages.dev',
        environment,
      ),
    ).toBe(false);
    expect(
      isAllowedFrontendOrigin(
        'https://productpulse.pages.dev.evil.example',
        environment,
      ),
    ).toBe(false);
    expect(
      isAllowedFrontendOrigin('https://unrelated.pages.dev', environment),
    ).toBe(false);
  });

  it('allows non-browser requests without an Origin header', () => {
    expect(isAllowedFrontendOrigin(undefined, environment)).toBe(true);
  });
});
