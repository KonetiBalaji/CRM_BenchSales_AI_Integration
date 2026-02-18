/**
 * Jest Global Teardown
 */

import { TestDatabaseSetup } from './test-database.setup';

export default async function globalTeardown() {
  // Cleanup test database
  await TestDatabaseSetup.teardownTestDatabase();

  console.log('✅ Test environment cleaned up');
}
