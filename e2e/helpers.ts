import { randomUUID } from 'node:crypto';
import { db } from '../lib/db';

const TEST_USER_PREFIX = 'e2e-smoke';

/** Build a unique test email so parallel runs don't collide. */
export function makeTestEmail(): string {
  const id = randomUUID().slice(0, 8);
  return `${TEST_USER_PREFIX}-${id}@test.example`;
}

export const TEST_PASSWORD = 'TestPass123!';
export const TEST_NAME = 'E2E Smoke User';

/** Delete any rows left behind by smoke-test runs. */
export async function cleanupTestData(): Promise<void> {
  await db.$executeRawUnsafe(
    `DELETE FROM "Note" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE '${TEST_USER_PREFIX}-%@test.example')`,
  );
  await db.$executeRawUnsafe(
    `DELETE FROM "Session" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE '${TEST_USER_PREFIX}-%@test.example')`,
  );
  await db.$executeRawUnsafe(
    `DELETE FROM "User" WHERE email LIKE '${TEST_USER_PREFIX}-%@test.example'`,
  );
}
