import { PrismaClient } from '@prisma/client';
import { CatalogueImporter } from '../catalogue/catalogue-importer';
import { loadCatalogueFixture } from '../catalogue/catalogue-snapshot';
import { fetchGoodSmileSnapshot } from '../catalogue/goodsmile-source';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const argumentsSet = new Set(process.argv.slice(2));
  const supportedArguments = new Set(['--live', '--reset-stock']);
  const unknownArguments = [...argumentsSet].filter(
    (argument) => !supportedArguments.has(argument),
  );
  if (unknownArguments.length > 0) {
    throw new Error(`Unknown arguments: ${unknownArguments.join(', ')}`);
  }
  if (argumentsSet.has('--live') && argumentsSet.has('--reset-stock')) {
    throw new Error('--live and --reset-stock cannot be used together');
  }

  const importer = new CatalogueImporter(prisma);
  if (argumentsSet.has('--reset-stock')) {
    const count = await importer.resetDemoStock();
    console.log(`Reset demo stock for ${count} Good Smile US products`);
    return;
  }

  const fixture = await loadCatalogueFixture();
  const snapshot = argumentsSet.has('--live')
    ? await fetchGoodSmileSnapshot(
        fixture.items.map((item) => item.sourceVariantId),
      )
    : fixture;
  const result = await importer.importSnapshot(snapshot);
  const source = argumentsSet.has('--live') ? 'live source' : 'fixture';
  console.log(
    `Imported ${result.total} catalogue items (${result.created} created, ${result.refreshed} refreshed) from ${source}`,
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
