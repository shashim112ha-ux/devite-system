const fs = require('fs');
const path = 'd:/devite/apps/server/src/router.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /updatePayrollDraft: managerProcedure\s*\.input\(z\.object\(\{([\s\S]*?)\}\)\)/m,
  "updatePayrollDraft: managerProcedure\n      .input(z.object({\,\n        editReason: z.string().optional()\n      }))"
);

content = content.replace(
  /return ctx\.prisma\.payroll\.update\(\{\n\s*where: \{ id: input\.id \},\n\s*data: \{([\s\S]*?)\}\n\s*\}\);/m,
  "return ctx.prisma.payroll.update({\n          where: { id: input.id },\n          data: {\,\n            editReason: input.editReason\n          }\n        });"
);

fs.writeFileSync(path, content);
console.log('Added editReason to updatePayrollDraft!');
