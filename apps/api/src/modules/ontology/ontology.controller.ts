import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";

import { CreateOntologyVersionDto, UpsertSkillOntologyDto } from "./dto/upsert-skill-ontology.dto";
import { OntologyService } from "./ontology.service";

@Controller("ontology")
export class OntologyController {
  constructor(private readonly ontology: OntologyService) {}

  @Get("skills")
  listSkills(
    @Query("version") version?: string,
    @Query("search") search?: string,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number
  ) {
    return this.ontology.listNodes(version, search, limit ?? 100);
  }

  @Post("skills/upsert")
  upsertSkills(@Body() payload: UpsertSkillOntologyDto) {
    return this.ontology.upsertSkills(payload);
  }

  @Post("skills/version")
  createVersion(@Body() payload: CreateOntologyVersionDto) {
    return this.ontology.createVersion(payload);
  }

  @Post("skills/:version/activate")
  activateVersion(@Param("version") version: string) {
    return this.ontology.activateVersionByLabel(version);
  }

  @Get("summary")
  summary() {
    return this.ontology.getCoverageSummary();
  }
}
