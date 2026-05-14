import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // Calculate dates: Started May 4, 2026
  const startDate = new Date("2026-05-04T00:00:00-06:00"); // MT timezone
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 75); // 75 days later

  // Create the group
  const group = await prisma.group.create({
    data: {
      name: "75 Hard - May 2026",
      startDate,
      endDate,
      taskCapPerDay: 10,
      penaltyPerTask: 2,
    },
  });

  console.log(`✅ Created group: ${group.name}`);
  console.log(`   Start: ${startDate.toLocaleDateString()}`);
  console.log(`   End: ${endDate.toLocaleDateString()}`);

  // Create the 6 users
  const users = [
    { name: "Keppner", slug: "keppner", email: "keppnerbarker7@gmail.com" },
    { name: "Winston", slug: "winston", email: "winston@placeholder.com" },
    { name: "Zach", slug: "zach", email: "zach@placeholder.com" },
    { name: "Landon", slug: "landon", email: "landon@placeholder.com" },
    { name: "Quade", slug: "quade", email: "quade@placeholder.com" },
    { name: "Hanah", slug: "hanah", email: "hanah@placeholder.com" },
  ];

  for (const userData of users) {
    const user = await prisma.user.create({
      data: {
        ...userData,
        groupId: group.id,
      },
    });
    console.log(`✅ Created user: ${user.name} (/${user.slug})`);
  }

  console.log("\n🎉 Seed completed!");
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Update the other 5 user emails when ready`);
  console.log(`   2. Backfill days 1-10 via admin page`);
  console.log(`   3. Start checking in at /checkin/[slug]`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
