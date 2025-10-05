import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateTenantDto, UpdateTenantDto } from "./dto/tenant.dto";

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return tenant;
  }

  create(dto: CreateTenantDto) {
    return this.prisma.tenant.create({ data: dto });
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }
}
