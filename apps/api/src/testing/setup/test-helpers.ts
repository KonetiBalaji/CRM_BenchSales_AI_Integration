/**
 * Test Helpers and Utilities
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RequestContextService } from '../../infrastructure/context';
import { AuthUser } from '../../modules/auth/interfaces/auth-user.interface';

export class TestHelpers {
  /**
   * Create a mock request context service with tenant
   */
  static createMockRequestContext(tenantId: string, user?: Partial<AuthUser>): Partial<RequestContextService> {
    return {
      getTenantId: jest.fn().mockReturnValue(tenantId),
      getUser: jest.fn().mockReturnValue({
        sub: user?.sub || 'test-user-123',
        email: user?.email || 'test@example.com',
        tenantId,
        roles: user?.roles || ['ADMIN'],
        ...user,
      }),
      getRequestId: jest.fn().mockReturnValue('test-request-123'),
    };
  }

  /**
   * Create a testing module with common providers
   */
  static async createTestingModule(providers: any[] = []): Promise<TestingModule> {
    return Test.createTestingModule({
      providers: [
        ...providers,
        {
          provide: PrismaService,
          useValue: {
            $connect: jest.fn(),
            $disconnect: jest.fn(),
          },
        },
      ],
    }).compile();
  }

  /**
   * Create mock JWT payload
   */
  static createMockJwtPayload(tenantId: string, role: string = 'ADMIN') {
    return {
      sub: 'auth0|test-user-123',
      email: 'test@example.com',
      'https://benchcrm.com/tenant_id': tenantId,
      'https://benchcrm.com/roles': [role],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
  }

  /**
   * Wait for async operations
   */
  static async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate random test data
   */
  static randomString(length: number = 10): string {
    return Math.random().toString(36).substring(2, length + 2);
  }

  static randomEmail(): string {
    return `test-${this.randomString()}@example.com`;
  }

  static randomSkills(count: number = 3): string[] {
    const skills = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'Go', 'Rust'];
    return skills.sort(() => Math.random() - 0.5).slice(0, count);
  }
}

/**
 * Test data factories
 */
export class TestDataFactory {
  static createTenant(override?: any) {
    return {
      id: `tenant-${TestHelpers.randomString()}`,
      name: `Test Tenant ${TestHelpers.randomString(5)}`,
      domain: `${TestHelpers.randomString()}.example.com`,
      ...override,
    };
  }

  static createUser(tenantId: string, override?: any) {
    return {
      tenantId,
      email: TestHelpers.randomEmail(),
      fullName: `Test User ${TestHelpers.randomString(5)}`,
      role: 'ADMIN',
      ...override,
    };
  }

  static createConsultant(tenantId: string, override?: any) {
    return {
      tenantId,
      firstName: `First-${TestHelpers.randomString(5)}`,
      lastName: `Last-${TestHelpers.randomString(5)}`,
      email: TestHelpers.randomEmail(),
      phone: '+1234567890',
      status: 'ACTIVE',
      availability: 'AVAILABLE',
      ...override,
    };
  }

  static createRequirement(tenantId: string, override?: any) {
    return {
      tenantId,
      title: `Senior Engineer ${TestHelpers.randomString(5)}`,
      description: 'Test requirement description',
      status: 'OPEN',
      priority: 'HIGH',
      clientName: 'Test Client',
      location: 'Remote',
      ...override,
    };
  }

  static createSubmission(tenantId: string, consultantId: string, requirementId: string, override?: any) {
    return {
      tenantId,
      consultantId,
      requirementId,
      status: 'DRAFT',
      ...override,
    };
  }
}
