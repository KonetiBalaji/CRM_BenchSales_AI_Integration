import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConsultantsService } from './consultants.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { DedupeService } from '../dedupe/dedupe.service';
import { CreateConsultantDto, UpdateConsultantDto } from './dto/consultant.dto';

describe('ConsultantsService', () => {
  let service: ConsultantsService;
  let prisma: PrismaService;
  let dedupe: DedupeService;

  const mockPrisma = {
    consultant: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    consultantSkill: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockDedupe = {
    refreshConsultantSignatures: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultantsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DedupeService, useValue: mockDedupe },
      ],
    }).compile();

    service = module.get<ConsultantsService>(ConsultantsService);
    prisma = module.get<PrismaService>(PrismaService);
    dedupe = module.get<DedupeService>(DedupeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated consultants', async () => {
      const tenantId = 'tenant-1';
      const mockConsultants = [
        { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      ];

      mockPrisma.consultant.findMany.mockResolvedValue(mockConsultants);
      mockPrisma.consultant.count.mockResolvedValue(1);

      const result = await service.list(tenantId);

      expect(result).toEqual({
        data: mockConsultants,
        pagination: {
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      });
      expect(mockPrisma.consultant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId },
          skip: 0,
          take: 50,
        }),
      );
    });

    it('should throw BadRequestException for invalid tenantId', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestException);
    });

    it('should handle search parameter', async () => {
      const tenantId = 'tenant-1';
      const search = 'John';

      mockPrisma.consultant.findMany.mockResolvedValue([]);
      mockPrisma.consultant.count.mockResolvedValue(0);

      await service.list(tenantId, search);

      expect(mockPrisma.consultant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { firstName: { contains: search, mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should sanitize and limit pagination parameters', async () => {
      const tenantId = 'tenant-1';

      mockPrisma.consultant.findMany.mockResolvedValue([]);
      mockPrisma.consultant.count.mockResolvedValue(0);

      await service.list(tenantId, undefined, 1, 200);

      expect(mockPrisma.consultant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  describe('get', () => {
    it('should return consultant by id', async () => {
      const tenantId = 'tenant-1';
      const id = 'consultant-1';
      const mockConsultant = {
        id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      mockPrisma.consultant.findFirst.mockResolvedValue(mockConsultant);

      const result = await service.get(tenantId, id);

      expect(result).toEqual(mockConsultant);
      expect(mockPrisma.consultant.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id, tenantId },
        }),
      );
    });

    it('should throw NotFoundException when consultant not found', async () => {
      mockPrisma.consultant.findFirst.mockResolvedValue(null);

      await expect(service.get('tenant-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for missing parameters', async () => {
      await expect(service.get('', 'id')).rejects.toThrow(BadRequestException);
      await expect(service.get('tenant-1', '')).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    const createDto: CreateConsultantDto = {
      tenantId: 'tenant-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '1234567890',
      location: 'New York',
      availability: 'AVAILABLE',
    };

    it('should create consultant successfully', async () => {
      const mockConsultant = { id: '1', ...createDto };

      mockPrisma.consultant.findFirst.mockResolvedValue(null);
      mockPrisma.consultant.create.mockResolvedValue(mockConsultant);
      mockDedupe.refreshConsultantSignatures.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result).toEqual(mockConsultant);
      expect(mockPrisma.consultant.create).toHaveBeenCalled();
      expect(mockDedupe.refreshConsultantSignatures).toHaveBeenCalledWith(
        createDto.tenantId,
        '1',
      );
    });

    it('should throw BadRequestException for missing required fields', async () => {
      const invalidDto = { ...createDto, email: '' };
      await expect(service.create(invalidDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid email format', async () => {
      const invalidDto = { ...createDto, email: 'invalid-email' };
      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate email', async () => {
      mockPrisma.consultant.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateConsultantDto = {
      firstName: 'Jane',
      email: 'jane@example.com',
    };

    const existingConsultant = {
      id: 'consultant-1',
      tenantId: 'tenant-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '1234567890',
      location: 'New York',
      availability: 'AVAILABLE',
      rate: null,
      experience: null,
      summary: null,
    };

    it('should update consultant successfully', async () => {
      const updatedConsultant = { ...existingConsultant, ...updateDto };

      mockPrisma.consultant.findFirst.mockResolvedValueOnce(existingConsultant);
      mockPrisma.consultant.findFirst.mockResolvedValueOnce(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          consultant: {
            update: jest.fn().mockResolvedValue(updatedConsultant),
          },
          consultantSkill: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
        });
      });
      mockDedupe.refreshConsultantSignatures.mockResolvedValue(undefined);

      const result = await service.update('tenant-1', 'consultant-1', updateDto);

      expect(result).toEqual(updatedConsultant);
    });

    it('should throw BadRequestException for invalid email format', async () => {
      mockPrisma.consultant.findFirst.mockResolvedValue(existingConsultant);

      const invalidDto = { email: 'invalid-email' };
      await expect(
        service.update('tenant-1', 'consultant-1', invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate email', async () => {
      mockPrisma.consultant.findFirst.mockResolvedValueOnce(existingConsultant);
      mockPrisma.consultant.findFirst.mockResolvedValueOnce({ id: 'other' });

      await expect(
        service.update('tenant-1', 'consultant-1', updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
