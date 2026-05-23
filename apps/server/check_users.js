const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({
  select: { name: true, phone: true, email: true, password: true, role: true, active: true }
}).then(users => {
  console.log('\n=== USERS IN DATABASE ===');
  users.forEach(u => {
    console.log(`Role: ${u.role} | Name: ${u.name} | Phone: ${u.phone} | Email: ${u.email} | Password: ${u.password} | Active: ${u.active}`);
  });
  console.log(`\nTotal: ${users.length} users`);
  return p.$disconnect();
}).catch(e => { console.error(e); p.$disconnect(); });
