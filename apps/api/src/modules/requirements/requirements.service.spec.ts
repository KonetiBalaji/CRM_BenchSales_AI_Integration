import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateRequirementDto, UpdateRequirementDto } from './dto/requirement.dto';

describe('RequirementsService', () => {
  let service: RequirementsService;
  let prisma: PrismaService;

  const mockPrisma = {
    requirement: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    requirementSkill: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequirementsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RequirementsService>(RequirementsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated requirements', async () => {
      const tenantId = 'tenant-1';
      const mockRequirements = [
        { id: '1', title: 'Software Engineer', clientName: 'Acme Corp' },
      ];

      mockPrisma.requirement.findMany.mockResolvedValue(mockRequirements);
      mockPrisma.requirement.count.mockResolvedValue(1);

      const result = await service.list(tenantId);

      expect(result).toEqual({
        data: mockRequirements,
        pagination: {
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      });
    });

    it('should filter by status', async () => {
      const tenantId = 'tenant-1';
      const status = 'OPEN';

      mockPrisma.requirement.findMany.mockResolvedValue([]);
      mockPrisma.requirement.count.mockResolvedValue(0);

      await service.list(tenantId, status);

      expect(mockPrisma.requirement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'OPEN',
          }),
        }),
      );
    });

    it('should throw BadRequestException for invalid tenantId', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    const createDto: CreateRequirementDto = {
      tenantId: 'tenant-1',
      title: 'Senior React Developer',
      clientName: 'Tech Corp',
      description: 'Looking for senior developer',
      location: 'Remote',
      type: 'CONTRACT',
      status: 'OPEN',
      source: 'DIRECT',
      minRate: 100,
      maxRate: 150,
    };

    it('should create requirement successfully', async () => {
      const mockRequirement = { id: '1', ...createDto };

      mockPrisma.requirement.create.mockResolvedValue(mockRequirement);

      const result = await service.create(createDto);

      expect(result).toEqual(mockRequirement);
      expect(mockPrisma.requirement.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for missing title', async () => {
      const invalidDto = { ...createDto, title: '' };
      await expect(service.create(invalidDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for title too long', async () => {
      const invalidDto = { ...createDto, title: 'x'.repeat(201) };
      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when minRate > maxRate', async () => {
      const invalidDto = { ...createDto, minRate: 200, maxRate: 100 };
      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });
});
