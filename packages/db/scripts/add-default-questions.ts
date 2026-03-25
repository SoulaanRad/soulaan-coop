import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addDefaultQuestions() {
  const config = await prisma.coopConfig.findFirst({
    where: { coopId: "soulaan", isActive: true },
  });

  if (config) {
    await prisma.coopConfig.update({
      where: { id: config.id },
      data: {
        applicationQuestions: [
          {
            id: "fullName",
            type: "text",
            label: "Full Name",
            placeholder: "Enter your full name",
            required: true,
          },
          {
            id: "email",
            type: "email",
            label: "Email Address",
            placeholder: "your.email@example.com",
            required: true,
          },
          {
            id: "phone",
            type: "phone",
            label: "Phone Number",
            placeholder: "(555) 123-4567",
            required: true,
          },
          {
            id: "occupation",
            type: "text",
            label: "Current Occupation",
            placeholder: "e.g., Teacher, Entrepreneur, Student",
            required: false,
          },
          {
            id: "whyJoin",
            type: "textarea",
            label: "Why do you want to join?",
            description: "Tell us about your interest in the cooperative",
            placeholder: "Share your motivation...",
            required: true,
          },
        ],
      },
    });
    console.log("✅ Application questions added to soulaan coop");
  } else {
    console.log("❌ No active soulaan coop found");
  }

  await prisma.$disconnect();
}

addDefaultQuestions();
