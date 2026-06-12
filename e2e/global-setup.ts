import { cleanupTestData } from './helpers';

/** Run once before the full suite — remove any leftover data from prior runs. */
export default async function globalSetup(): Promise<void> {
  console.log('[global-setup] Cleaning stale smoke-test data…');
  await cleanupTestData();
  console.log('[global-setup] Done.');
}
