const fs = require('fs');
const routerPath = 'd:/devite/apps/server/src/router.ts';
let content = fs.readFileSync(routerPath, 'utf8');

const regex = /getAuditLogs: adminProcedure\.query\(async \(\{ ctx \}\) => \{[\s\S]*?\}\),/;
const replacement = `getAuditLogs: adminProcedure
    .input(z.object({ filterType: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      let whereClause: any = {};
      if (input?.filterType === 'today') {
        const start = new Date();
        start.setHours(0,0,0,0);
        whereClause.createdAt = { gte: start };
      }
      return ctx.prisma.auditLog.findMany({
        where: whereClause,
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' }
      });
    }),`;

content = content.replace(regex, replacement);
fs.writeFileSync(routerPath, content);
console.log('Done AuditLogs!');
