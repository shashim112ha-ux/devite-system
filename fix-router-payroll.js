const fs = require('fs');
const path = 'd:/devite/apps/server/src/router.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /updatePayrollDraft: managerProcedure\s*\.input\(z\.object\(\{\s*,[\s\S]*?editReason: z\.string\(\)\.optional\(\)\s*\}\)\)\s*\.mutation\(async \(\{ input, ctx \}\) => \{[\s\S]*?\}\);/;

const replacement = `updatePayrollDraft: managerProcedure
    .input(z.object({
      id: z.string(),
      bonuses: z.number().optional(),
      deductions: z.number().optional(),
      advances: z.number().optional(),
      notes: z.string().optional(),
      editReason: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.prisma.payroll.findUnique({
        where: { id: input.id }
      });
      if (!existing) throw new Error('لا يوجد قيد مالي بهذا المعرف');
      if (existing.status !== 'DRAFT' && ctx.user.role !== 'ADMIN') {
        throw new Error('لا يمكن تعديل الرواتب المعتمدة إلا من قبل الإدارة العليا');
      }

      const bonuses = input.bonuses ?? existing.bonuses;
      const manualDeductions = input.deductions ?? existing.manualDeductions;
      const advances = input.advances ?? existing.advances;
      const netSalary = existing.basicSalary + existing.overtimePay + bonuses - existing.deductions - manualDeductions - advances;

      return ctx.prisma.payroll.update({
        where: { id: input.id },
        data: {
          bonuses,
          manualDeductions,
          advances,
          netSalary,
          notes: input.notes ?? existing.notes,
          editReason: input.editReason ?? existing.editReason
        }
      });
    });`;

content = content.replace(regex, replacement);

fs.writeFileSync(path, content);
console.log('Fixed updatePayrollDraft!');
