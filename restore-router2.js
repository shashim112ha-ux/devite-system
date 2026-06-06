const fs = require('fs');
const path = 'd:/devite/apps/server/src/router.ts';
let content = fs.readFileSync(path, 'utf8');

const replacement = `              overtimePay,
              netSalary
            }
          });
        } else {
          pr = await ctx.prisma.payroll.create({
            data: {
              userId: u.id,
              startDate: input.startDate,
              endDate: input.endDate,
              presenceDays,
              absenceDays,
              workHours,
              overtimeHours,
              delayHours,
              basicSalary,
              overtimePay,
              netSalary,
              status: 'DRAFT'
            }
          });
        }
        payrolls.push(pr);
      }

      await logAudit(ctx.prisma, ctx.user.id, 'CALCULATE_PAYROLL', \`احتساب رواتب الموظفين للفترة من \${input.startDate.toLocaleDateString('ar-BH')} إلى \${input.endDate.toLocaleDateString('ar-BH')}\`);
      return payrolls;
    }),

  updatePayrollDraft: managerProcedure
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
      if (!existing) throw new Error('لا يوجد قيد مالي');
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
    }),

  approvePayroll: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const payroll = await ctx.prisma.payroll.update({
        where: { id: input.id },
        data: { status: 'APPROVED', approvedBy: ctx.user.name }
      });
      await logAudit(ctx.prisma, ctx.user.id, 'APPROVE_PAYROLL', \`اعتماد راتب الموظف ID: \${payroll.userId}\`);
      return payroll;
    }),

  paySalary: managerProcedure
    .input(z.object({ id: z.string(), accountId: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const payroll = await ctx.prisma.payroll.update({
        where: { id: input.id },
        data: { status: 'PAID', paymentDate: new Date() }
      });
      // Automatically record as an expense
      const user = await ctx.prisma.user.findUnique({ where: { id: payroll.userId } });
      
      let accountName = 'حساب غير محدد';
      if (input.accountId) {
         const acc = await ctx.prisma.account.update({
           where: { id: input.accountId },
           data: { balance: { decrement: payroll.netSalary } }
         });
         accountName = acc.name;
      }

      await ctx.prisma.expense.create({
        data: {
          title: \`راتب \${user?.name} لشهر \${payroll.startDate.getMonth() + 1}\`,
          amount: payroll.netSalary,
          category: 'PAYROLL',
          date: new Date(),
          paidBy: ctx.user.name,
          accountId: input.accountId,
          accountName: accountName
        }
      });
      await logAudit(ctx.prisma, ctx.user.id, 'PAY_SALARY', \`دفع راتب الموظف ID: \${payroll.userId}\`);
      return payroll;
    }),

  // --- Investor Panel ---
  getInvestors: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.investor.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }),

  withdrawInvestorProfit: adminProcedure
    .input(z.object({ investorId: z.string(), amount: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const investor = await ctx.prisma.investor.update({
        where: { id: input.investorId },
        data: { totalWithdrawn: { increment: input.amount } }`;

const regex = /              basicSalary,\s*data: \{ totalWithdrawn: \{ increment: input\.amount \} \}/s;
if (regex.test(content)) {
  content = content.replace(regex, '              basicSalary,\n' + replacement);
  fs.writeFileSync(path, content);
  console.log('Restored router.ts');
} else {
  console.log('Could not find the broken segment with Regex.');
}
