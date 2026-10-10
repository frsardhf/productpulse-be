import { PrismaClient } from '@prisma/client';
import { CatalogueImporter } from '../catalogue/catalogue-importer';
import { loadCatalogueFixture } from '../catalogue/catalogue-snapshot';
import { fetchMetSnapshot } from '../catalogue/met-source';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const argumentsSet = new Set(process.argv.slice(2));
  const supportedArguments = new Set(['--live', '--reset-stock', '--replace']);
  const unknownArguments = [...argumentsSet].filter(
    (argument) => !supportedArguments.has(argument),
  );
  if (unknownArguments.length > 0) {
    throw new Error(`Unknown arguments: ${unknownArguments.join(', ')}`);
  }
  if (argumentsSet.has('--reset-stock') && argumentsSet.size > 1) {
    throw new Error('--reset-stock cannot be combined with other arguments');
  }

  const importer = new CatalogueImporter(prisma);
  if (argumentsSet.has('--reset-stock')) {
    const count = await importer.resetDemoStock();
    console.log(`Reset demo stock for ${count} Met catalogue products`);
    return;
  }

  const snapshot = argumentsSet.has('--live')
    ? await fetchMetSnapshot()
    : await loadCatalogueFixture();
  const result = await importer.importSnapshot(snapshot, {
    archiveOtherProviders: argumentsSet.has('--replace'),
  });
  const source = argumentsSet.has('--live') ? 'live source' : 'fixture';
  console.log(
    `Imported ${result.total} catalogue items (${result.created} created, ${result.refreshed} refreshed, ${result.archived} archived) from ${source}`,
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
