-- Add unique constraint for consultant and requirement matches
CREATE UNIQUE INDEX "Match_consultantId_requirementId_key" ON "Match"("consultantId", "requirementId");
