import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed Users
  await prisma.user.createMany({
    data: [
      { email: "alice@example.com", name: "Alice", role: "user" },
      { email: "bob@example.com", name: "Bob", role: "business" },
      { email: "admin@example.com", name: "Admin", role: "admin" },
    ],
    skipDuplicates: true,
  });

  // Seed Businesses
  await prisma.business.createMany({
    data: [
      { ownerId: "1", name: "Alice's Bakery", city: "New York" },
      { ownerId: "2", name: "Bob's Cafe", city: "San Francisco" },
    ],
    skipDuplicates: true,
  });

  // Seed Waitlist Entries
  await prisma.waitlistEntry.createMany({
    data: [
      { email: "waitlist1@example.com", type: "user", name: "Wait User", city: "Boston", source: "hero" },
      { email: "waitlist2@example.com", type: "business", name: "Wait Biz", city: "Chicago", source: "contact" },
    ],
    skipDuplicates: true,
  });

  // Seed Business Waitlist Entries
  await prisma.businessWaitlist.createMany({
    data: [
      {
        ownerName: "John Smith",
        ownerEmail: "john@example.com",
        businessName: "Smith's Coffee Shop",
        businessAddress: "123 Main St, New York, NY",
        businessType: "Food & Beverage",
        monthlyRevenue: "$10,000 - $25,000",
        description: "Local coffee shop looking to expand",
      },
      {
        ownerName: "Sarah Johnson",
        ownerEmail: "sarah@example.com",
        businessName: "Johnson's Hardware",
        businessAddress: "456 Oak Ave, Chicago, IL",
        businessType: "Retail",
        monthlyRevenue: "$25,000 - $50,000",
        description: "Family-owned hardware store",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
