import { isAllowedFrontendOrigin } from './cors';

describe('frontend CORS origin policy', () => {
  const environment = {
    FRONTEND_ORIGINS:
      'https://shop.example.com, https://relicase.pages.dev/',
    FRONTEND_PREVIEW_DOMAIN: 'relicase.pages.dev',
  };

  it('allows configured production and local origins', () => {
    expect(
      isAllowedFrontendOrigin('https://shop.example.com', environment),
    ).toBe(true);
    expect(
      isAllowedFrontendOrigin('https://relicase.pages.dev', environment),
    ).toBe(true);
    expect(isAllowedFrontendOrigin('http://localhost:3001', environment)).toBe(
      true,
    );
  });

  it('allows HTTPS Cloudflare Pages preview subdomains', () => {
    expect(
      isAllowedFrontendOrigin(
        'https://a1b2c3.relicase.pages.dev',
        environment,
      ),
    ).toBe(true);
    expect(
      isAllowedFrontendOrigin(
        'https://feature-checkout.relicase.pages.dev',
        environment,
      ),
    ).toBe(true);
  });

  it('rejects insecure, lookalike, and unrelated origins', () => {
    expect(
      isAllowedFrontendOrigin(
        'http://preview.relicase.pages.dev',
        environment,
      ),
    ).toBe(false);
    expect(
      isAllowedFrontendOrigin(
        'https://relicase.pages.dev.evil.example',
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
