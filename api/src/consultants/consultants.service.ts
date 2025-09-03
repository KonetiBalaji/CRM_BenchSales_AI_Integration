// Bench Sales CRM API - Consultants Service
// Created by Balaji Koneti
// This service handles all consultant-related business logic and database operations

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultantDto } from './dto/create-consultant.dto';
import { UpdateConsultantDto } from './dto/update-consultant.dto';

// Default company ID for demo purposes
const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class ConsultantsService {
  constructor(private prisma: PrismaService) {}

  // Create a new consultant
  create(dto: CreateConsultantDto) {
    return this.prisma.consultant.create({ 
      data: { 
        ...dto, 
        companyId: DEFAULT_COMPANY_ID 
      } 
    });
  }

  // Find all consultants with optional search
  findAll(q?: string) {
    return this.prisma.consultant.findMany({
      where: q ? { 
        OR: [ 
          { name: { contains: q, mode: 'insensitive' } }, 
          { skills: { has: q } } 
        ] 
      } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Find a consultant by ID
  findOne(id: string) { 
    return this.prisma.consultant.findUnique({ where: { id } }); 
  }

  // Update a consultant
  update(id: string, dto: UpdateConsultantDto) {
    return this.prisma.consultant.update({ 
      where: { id }, 
      data: dto 
    });
  }

  // Delete a consultant
  remove(id: string) { 
    return this.prisma.consultant.delete({ where: { id } }); 
  }
}
