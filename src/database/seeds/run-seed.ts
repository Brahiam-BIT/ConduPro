import 'reflect-metadata';

import dataSource from '../data-source';
import { runDevSeed } from './dev.seed';

async function main(): Promise<void> {
  await dataSource.initialize();

  try {
    await runDevSeed(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Error ejecutando seed:', error);
  process.exit(1);
});
