/**
 * Jest Global Setup
 */

import { TestDatabaseSetup } from './test-database.setup';

export default async function globalSetup() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.ENABLE_DEV_ROUTES = '0';

  // Initialize test database
  global.__TEST_DB__ = await TestDatabaseSetup.setupTestDatabase();

  console.log('✅ Test environment initialized');
}
