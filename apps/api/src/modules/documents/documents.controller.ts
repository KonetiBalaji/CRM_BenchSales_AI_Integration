import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from "@nestjs/common";

import { RequestContextService } from "../../infrastructure/context";
import { DocumentsService } from "./documents.service";
import { CreateUploadRequestDto } from "./dto/create-upload-request.dto";
import { UpdateDocumentMetadataDto } from "./dto/update-document-metadata.dto";

@Controller("tenants/:tenantId/documents")
export class DocumentsController {
  constructor(private readonly documents: DocumentsService, private readonly context: RequestContextService) {}

  @Get()
  list(@Param("tenantId") tenantId: string, @Query("limit", new ParseIntPipe({ optional: true })) limit?: number) {
    return this.documents.list(tenantId, limit ?? 25);
  }

  @Post("upload-url")
  @HttpCode(201)
  createUploadRequest(@Param("tenantId") tenantId: string, @Body() dto: CreateUploadRequestDto) {
    const actor = this.context.getUser();
    return this.documents.createUploadRequest(tenantId, dto, actor?.sub ?? undefined);
  }

  @Post(":documentId/metadata")
  updateMetadata(
    @Param("tenantId") tenantId: string,
    @Param("documentId") documentId: string,
    @Body() dto: UpdateDocumentMetadataDto
  ) {
    return this.documents.updateMetadata(tenantId, documentId, dto);
  }

  @Get(":documentId/download-url")
  getDownloadUrl(@Param("tenantId") tenantId: string, @Param("documentId") documentId: string) {
    return this.documents.getDownloadUrl(tenantId, documentId);
  }
}
