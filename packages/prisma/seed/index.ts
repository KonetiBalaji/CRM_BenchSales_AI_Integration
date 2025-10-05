import { createHash } from "crypto";

import { PrismaClient, Prisma, ConsultantAvailability, IdentitySignatureType, RequirementStatus, RequirementType, UserRole } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

type TxClient = Prisma.TransactionClient;

const DEFAULT_COUNTRY = "US";
const DEFAULT_LOCALE = "en-US";
const ONTOLOGY_VERSION = "v1-demo";

async function ensureDemoTenant(tx: TxClient) {
  return tx.tenant.upsert({
    where: { id: "demo-tenant" },
    update: {},
    create: {
      id: "demo-tenant",
      name: "Demo Staffing",
      domain: "demo.benchcrm.ai"
    }
  });
}

async function ensureDemoOwner(tx: TxClient, tenantId: string) {
  await tx.user.upsert({
    where: { auth0Id: "auth0|demo-owner" },
    update: {
      email: "owner@demo.benchcrm.ai",
      fullName: "Demo Owner",
      role: UserRole.OWNER
    },
    create: {
      tenantId,
      auth0Id: "auth0|demo-owner",
      email: "owner@demo.benchcrm.ai",
      fullName: "Demo Owner",
      role: UserRole.OWNER
    }
  });
}

async function ensureSkills(tx: TxClient) {
  const skills = await tx.skill.count();
  if (skills === 0) {
    await tx.skill.createMany({
      data: [
        { id: "skill-node", name: "Node.js", category: "Backend" },
        { id: "skill-react", name: "React", category: "Frontend" },
        { id: "skill-aws", name: "AWS", category: "Cloud" },
        { id: "skill-sql", name: "SQL", category: "Database" },
        { id: "skill-python", name: "Python", category: "Backend" }
      ],
      skipDuplicates: true
    });
  }
}

async function ensureSkillOntology(tx: TxClient) {
  let version = await tx.skillOntologyVersion.findUnique({ where: { version: ONTOLOGY_VERSION } });
  if (!version) {
    version = await tx.skillOntologyVersion.create({
      data: {
        version: ONTOLOGY_VERSION,
        source: "seed",
        isActive: true,
        publishedAt: new Date()
      }
    });
  }

  const skills = await tx.skill.findMany();
  for (const skill of skills) {
    const node = await tx.skillOntologyNode.upsert({
      where: {
        versionId_canonicalName: {
          versionId: version.id,
          canonicalName: skill.name
        }
      },
      create: {
        versionId: version.id,
        canonicalName: skill.name,
        category: skill.category ?? null,
        description: null,
        tags: []
      },
      update: {
        category: skill.category ?? null
      }
    });

    await tx.skill.update({ where: { id: skill.id }, data: { ontologyNodeId: node.id } });

    const aliasValue = skill.name.toLowerCase();
    await tx.skillOntologyAlias.upsert({
      where: {
        nodeId_value: {
          nodeId: node.id,
          value: aliasValue
        }
      },
      create: {
        nodeId: node.id,
        value: aliasValue,
        locale: DEFAULT_LOCALE
      },
      update: {}
    });
  }

  await tx.skillOntologyVersion.updateMany({
    where: { id: { not: version.id } },
    data: { isActive: false }
  });
  await tx.skillOntologyVersion.update({ where: { id: version.id }, data: { isActive: true } });
}

async function ensureCanonicalLocation(tx: TxClient, name?: string) {
  if (!name) {
    return null;
  }
  const canonicalName = name.trim();
  const base = await tx.locationCanonical.upsert({
    where: {
      canonicalName_countryCode: {
        canonicalName,
        countryCode: DEFAULT_COUNTRY
      }
    },
    update: {},
    create: {
      canonicalName,
      countryCode: DEFAULT_COUNTRY
    }
  });

  await tx.locationAlias.upsert({
    where: {
      locationId_value: {
        locationId: base.id,
        value: canonicalName.toLowerCase()
      }
    },
    update: {},
    create: {
      locationId: base.id,
      value: canonicalName.toLowerCase(),
      locale: DEFAULT_LOCALE
    }
  });

  return base;
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function ensureConsultants(tx: TxClient, tenantId: string) {
  const consultantCount = await tx.consultant.count({ where: { tenantId } });
  if (consultantCount > 0) {
    return;
  }

  const skillRecords = await tx.skill.findMany();
  for (let i = 0; i < 5; i += 1) {
    const location = faker.location.city();
    const canonical = await ensureCanonicalLocation(tx, location);

    const consultant = await tx.consultant.create({
      data: {
        tenantId,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        location,
        canonicalLocationId: canonical?.id ?? null,
        availability: ConsultantAvailability.AVAILABLE,
        rate: new Prisma.Decimal("85.00"),
        experience: new Prisma.Decimal("5.0"),
        summary: faker.person.bio()
      }
    });

    const selectedSkills = faker.helpers.arrayElements(skillRecords, { min: 2, max: 4 });
    await tx.consultantSkill.createMany({
      data: selectedSkills.map((skill) => ({
        tenantId,
        consultantId: consultant.id,
        skillId: skill.id,
        weight: faker.number.int({ min: 40, max: 90 })
      }))
    });
  }
}

async function ensureRequirements(tx: TxClient, tenantId: string) {
  const requirementCount = await tx.requirement.count({ where: { tenantId } });
  if (requirementCount > 0) {
    return;
  }

  const skillRecords = await tx.skill.findMany();
  for (let i = 0; i < 3; i += 1) {
    const location = faker.location.city();
    const canonical = await ensureCanonicalLocation(tx, location);

    const requirement = await tx.requirement.create({
      data: {
        tenantId,
        title: faker.person.jobTitle(),
        clientName: faker.company.name(),
        description: faker.lorem.paragraph(),
        location,
        canonicalLocationId: canonical?.id ?? null,
        type: RequirementType.CONTRACT,
        status: RequirementStatus.OPEN
      }
    });

    const selectedSkills = faker.helpers.arrayElements(skillRecords, { min: 2, max: 4 });
    await tx.requirementSkill.createMany({
      data: selectedSkills.map((skill) => ({
        tenantId,
        requirementId: requirement.id,
        skillId: skill.id,
        weight: faker.number.int({ min: 40, max: 90 })
      }))
    });
  }
}

async function seedConsultantIdentity(tx: TxClient, tenantId: string) {
  const consultants = await tx.consultant.findMany({ where: { tenantId } });

  for (const consultant of consultants) {
    const signatures: Array<{ type: IdentitySignatureType; hash: string; raw: string }> = [];

    if (consultant.email) {
      const normalized = consultant.email.trim().toLowerCase();
      signatures.push({ type: IdentitySignatureType.EMAIL, hash: hash(normalized), raw: consultant.email });
    }

    if (consultant.phone) {
      const normalized = consultant.phone.replace(/[^0-9]/g, "");
      if (normalized) {
        signatures.push({ type: IdentitySignatureType.PHONE, hash: hash(normalized), raw: consultant.phone });
      }
    }

    const nameParts = [consultant.firstName, consultant.lastName].filter(Boolean).join(" ").toLowerCase().trim();
    if (nameParts) {
      signatures.push({ type: IdentitySignatureType.NAME, hash: hash(nameParts), raw: nameParts });
    }

    if (signatures.length === 0) {
      continue;
    }

    for (const signature of signatures) {
      await tx.identitySignature.upsert({
        where: {
          tenantId_type_valueHash_consultantId: {
            tenantId,
            type: signature.type,
            valueHash: signature.hash,
            consultantId: consultant.id
          }
        },
        create: {
          tenantId,
          consultantId: consultant.id,
          type: signature.type,
          valueHash: signature.hash,
          rawValue: signature.raw
        },
        update: {
          rawValue: signature.raw
        }
      });
    }
  }
}

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL app.current_tenant = 'system'");

    const tenant = await ensureDemoTenant(tx);
    await ensureDemoOwner(tx, tenant.id);
    await ensureSkills(tx);
    await ensureSkillOntology(tx);
    await ensureConsultants(tx, tenant.id);
    await seedConsultantIdentity(tx, tenant.id);
    await ensureRequirements(tx, tenant.id);
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
