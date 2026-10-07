import { PrismaClient } from '@prisma/client';
import { CatalogueImporter } from '../catalogue/catalogue-importer';
import { loadCatalogueFixture } from '../catalogue/catalogue-snapshot';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const snapshot = await loadCatalogueFixture();
  const result = await new CatalogueImporter(prisma).importSnapshot(snapshot);
  console.log(
    `Imported ${result.total} catalogue items (${result.created} created, ${result.refreshed} refreshed)`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
