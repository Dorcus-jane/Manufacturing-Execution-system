import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@dojohub.test";
  const plainPassword = "ChangeMe123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Executive account already exists:", email);
    return;
  }

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const executive = await prisma.user.create({
    data: {
      role: "EXECUTIVE",
      fullName: "Default Executive",
      email,
      passwordHash,
      isActive: true,
    },
  });

  console.log("Created Executive account:");
  console.log("  email:   ", email);
  console.log("  password:", plainPassword);
  console.log("  id:      ", executive.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());