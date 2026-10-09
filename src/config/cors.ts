import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const DEFAULT_FRONTEND_ORIGINS = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

function normalizedOrigin(value: string): string {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Unsupported frontend origin protocol: ${url.protocol}`);
  }
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `Frontend origin must not contain credentials or a path: ${value}`,
    );
  }
  return url.origin;
}

function configuredOrigins(environment: NodeJS.ProcessEnv): Set<string> {
  const values = [
    ...DEFAULT_FRONTEND_ORIGINS,
    environment.FRONTEND_URL,
    ...(environment.FRONTEND_ORIGINS?.split(',') ?? []),
  ].filter((value): value is string => Boolean(value?.trim()));

  return new Set(values.map(normalizedOrigin));
}

function previewDomain(environment: NodeJS.ProcessEnv): string | null {
  const value = environment.FRONTEND_PREVIEW_DOMAIN?.trim().toLowerCase();
  if (!value) return null;
  if (
    value.includes('/') ||
    value.includes(':') ||
    !value.endsWith('.pages.dev')
  ) {
    throw new Error(
      'FRONTEND_PREVIEW_DOMAIN must be a Pages hostname such as relicase.pages.dev',
    );
  }
  return value;
}

export function isAllowedFrontendOrigin(
  origin: string | undefined,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!origin) return true;

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (configuredOrigins(environment).has(url.origin)) return true;

  const pagesDomain = previewDomain(environment);
  return Boolean(
    pagesDomain &&
      url.protocol === 'https:' &&
      (url.hostname === pagesDomain ||
        url.hostname.endsWith(`.${pagesDomain}`)),
  );
}

export function createCorsOptions(
  environment: NodeJS.ProcessEnv = process.env,
): CorsOptions {
  return {
    origin: (origin, callback) => {
      callback(null, isAllowedFrontendOrigin(origin, environment));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
}
