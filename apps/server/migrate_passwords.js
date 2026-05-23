const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users to migrate.`);
  
  for (const user of users) {
    if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });
      console.log(`Migrated password for user: ${user.email || user.phone}`);
    } else {
      console.log(`User ${user.email || user.phone} is already migrated.`);
    }
  }
  console.log('Migration complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
