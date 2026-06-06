              overtimeHours,
              delayHours,
              basicSalary,
data: { totalWithdrawn: { increment: input.amount } }
      });
      await logAudit(ctx.prisma, ctx.user.id, 'INVESTOR_WITHDRAW', `سحب أرباح للمستثمر ${investor.name} بقيمة ${input.amount} د.ب`);
      return investor;
    }),

  distributeInvestorProfit: adminProcedure
    .input(z.object({ amountToDistribute: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const investors = await ctx.prisma.investor.findMany({ where: { isActive: true } });
      const totalPercentage = investors.reduce((sum, inv) => sum + inv.sharePercentage, 0);
      if (totalPercentage === 0) throw new Error('لا يوجد مستثمرون مسجلون لتوزيع الأرباح');
   
        const netSalary = basicSalary + overtimePay;

        // Check if there is already a DRAFT record for this user in this period
        const existing = await ctx.prisma.payroll.findFirst({
          where: {
            userId: u.id,
            startDate: input.startDate,
            endDate: input.endDate,
            status: 'DRAFT'
          }
        });

        let pr;
        if (existing) {
          pr = await ctx.prisma.payroll.update({
            where: { id: existing.id },
            data: {
              presenceDays,
              absenceDays,
              workHours,
              overtimeHours,
              delayHours,
              basicSalary,
              overtimePay,
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

      await logAudit(ctx.prisma, ctx.user.id, 'CALCULATE_PAYROLL', `احتساب رواتب الموظفين للفترة من ${input.startDate.toLocaleDateString('ar-BH')} إلى ${input.endDate.toLocaleDateString('ar-BH')}`);
      return payrolls;
    }),

  updatePayrollDraft: managerProcedure
    .input(z.object({
      id: z.string(),