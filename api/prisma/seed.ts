// Bench Sales CRM Database Seed File
// Created by Balaji Koneti
// This file populates the database with initial sample data

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");
  
  // Create a sample company
  const acme = await prisma.company.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: { 
      id: "00000000-0000-0000-0000-000000000001", 
      name: "Acme Staffing" 
    },
  });

  console.log("✅ Company created:", acme.name);

  // Create a sample admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@acme.test" },
    update: {},
    create: {
      email: "admin@acme.test",
      name: "Admin",
      role: "Admin",
      companyId: acme.id,
    },
  });

  console.log("✅ Admin user created:", admin.email);

  // Create sample consultants
  const consultants = await prisma.consultant.createMany({
    data: [
      { 
        companyId: acme.id, 
        name: "Ravi Kumar", 
        primarySkill: "Java", 
        skills: ["Java", "Spring", "AWS"], 
        location: "Austin, TX", 
        rateMin: 65 
      },
      { 
        companyId: acme.id, 
        name: "Priya Singh", 
        primarySkill: "React", 
        skills: ["React", "TypeScript", "Node"], 
        location: "Remote", 
        rateMin: 60 
      },
      { 
        companyId: acme.id, 
        name: "Ahmed Ali", 
        primarySkill: "Data Engineer", 
        skills: ["Python", "Airflow", "Snowflake"], 
        location: "NYC", 
        rateMin: 75 
      }
    ],
    skipDuplicates: true,
  });

  console.log("✅ Consultants created:", consultants.count);
  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
