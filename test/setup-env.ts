process.env.JWT_SECRET_KEY = 'productpulse-e2e-test-secret';
process.env.POSTGRES_PRISMA_URL =
  'postgresql://productpulse:productpulse@localhost:5432/productpulse_test';
process.env.POSTGRES_URL_NON_POOLING = process.env.POSTGRES_PRISMA_URL;
