/**
 * Test Database Setup
 * Provides isolated test database instances for integration tests
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

export class TestDatabaseSetup {
  private static prisma: PrismaClient;
  private static databaseUrl: string;

  static async setupTestDatabase(): Promise<PrismaClient> {
    // Generate unique database name for this test run
    const dbName = `test_db_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const baseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432';
    this.databaseUrl = `${baseUrl.split('/').slice(0, -1).join('/')}/${dbName}`;

    // Create test database
    execSync(`createdb ${dbName}`, { stdio: 'ignore' });

    // Initialize Prisma client
    this.prisma = new PrismaClient({
      datasources: { db: { url: this.databaseUrl } },
    });

    // Run migrations
    process.env.DATABASE_URL = this.databaseUrl;
    execSync('pnpm --filter prisma migrate deploy', { stdio: 'ignore' });

    await this.prisma.$connect();
    return this.prisma;
  }

  static async teardownTestDatabase(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }

    // Drop test database
    const dbName = this.databaseUrl.split('/').pop();
    if (dbName?.startsWith('test_db_')) {
      execSync(`dropdb ${dbName}`, { stdio: 'ignore' });
    }
  }

  static async seedTestData(prisma: PrismaClient) {
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        id: 'test-tenant-001',
        name: 'Test Tenant',
        domain: 'test.example.com',
      },
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'ADMIN',
      },
    });

    return { tenant, user };
  }

  static async cleanDatabase(prisma: PrismaClient) {
    // Clean all tables in reverse order of dependencies
    const tables = [
      'MatchFeedback',
      'MatchFeatureSnapshot',
      'Match',
      'Interview',
      'Submission',
      'RequirementSkill',
      'Requirement',
      'ConsultantSkill',
      'ConsultantTag',
      'Consultant',
      'Skill',
      'AuditLog',
      'AiActivity',
      'User',
      'Tenant',
    ];

    for (const table of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    }
  }
}
