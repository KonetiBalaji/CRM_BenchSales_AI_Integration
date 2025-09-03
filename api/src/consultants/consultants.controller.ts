// Bench Sales CRM API - Consultants Controller
// Created by Balaji Koneti
// This controller handles all HTTP requests related to consultants

import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ConsultantsService } from './consultants.service';
import { CreateConsultantDto } from './dto/create-consultant.dto';
import { UpdateConsultantDto } from './dto/update-consultant.dto';

@Controller('v1/consultants')
export class ConsultantsController {
  constructor(private readonly service: ConsultantsService) {}

  // Create a new consultant
  @Post()
  create(@Body() dto: CreateConsultantDto) { 
    return this.service.create(dto); 
  }

  // Get all consultants with optional search
  @Get()
  findAll(@Query('q') q?: string) { 
    return this.service.findAll(q); 
  }

  // Get a consultant by ID
  @Get(':id')
  findOne(@Param('id') id: string) { 
    return this.service.findOne(id); 
  }

  // Update a consultant
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConsultantDto) { 
    return this.service.update(id, dto); 
  }

  // Delete a consultant
  @Delete(':id')
  remove(@Param('id') id: string) { 
    return this.service.remove(id); 
  }
}
