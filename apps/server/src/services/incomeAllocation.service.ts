export const BUCKET_LABELS: Record<string, string> = {
  PURCHASE_DEVELOPMENT: 'التطوير والمشتريات والتشغيل',
  MAINTENANCE: 'الصيانة',
  LABOR: 'العمال',
  CAPITAL: 'رأس المال',
};

export type Bucket = 'PURCHASE_DEVELOPMENT' | 'MAINTENANCE' | 'LABOR' | 'CAPITAL';

export function toBusinessDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function f3(n: number): number {
  return parseFloat(n.toFixed(3));
}

function closingField(bucket: string): string {
  const m: Record<string, string> = {
    PURCHASE_DEVELOPMENT: 'purchaseClosingBal',
    MAINTENANCE: 'maintenanceClosingBal',
    LABOR: 'laborClosingBal',
    CAPITAL: 'capitalClosingBal',
  };
  return m[bucket];
}

export async function getActiveRule(businessDate: Date, prisma: any) {
  const rule = await prisma.incomeAllocationRule.findFirst({
    where: {
      effectiveFrom: { lte: businessDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: businessDate } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  });
  return rule || { purchasePct: 40, maintenancePct: 10, laborPct: 30, capitalPct: 20, id: null };
}

async function getPrevBalances(bd: Date, prisma: any) {
  const p = await prisma.incomeAllocationDay.findFirst({
    where: { businessDate: { lt: bd } },
    orderBy: { businessDate: 'desc' },
  });
  return p
    ? { purchaseClosingBal: p.purchaseClosingBal, maintenanceClosingBal: p.maintenanceClosingBal, laborClosingBal: p.laborClosingBal, capitalClosingBal: p.capitalClosingBal }
    : { purchaseClosingBal: 0, maintenanceClosingBal: 0, laborClosingBal: 0, capitalClosingBal: 0 };
}

export async function getEligibleIncomeForDate(bd: Date, prisma: any): Promise<number> {
  const s = new Date(bd); s.setHours(0, 0, 0, 0);
  const e = new Date(bd); e.setHours(23, 59, 59, 999);
  const r = await prisma.order.aggregate({
    _sum: { total: true },
    where: { createdAt: { gte: s, lte: e }, status: { not: 'CANCELLED' } },
  });
  return r._sum.total || 0;
}

export async function getBucketBalance(bucket: Bucket, upTo: Date, prisma: any): Promise<number> {
  const last = await prisma.incomeAllocationTransaction.findFirst({
    where: { bucket, businessDate: { lte: upTo } },
    orderBy: { createdAt: 'desc' },
  });
  return last ? last.balanceAfter : 0;
}

async function recordTx(p: any) {
  const cur = await getBucketBalance(p.bucket, p.date, p.prisma);
  const nb = f3(p.dir === 'CREDIT' ? cur + p.amount : cur - p.amount);
  const tx = await p.prisma.incomeAllocationTransaction.create({
    data: {
      allocationDayId: p.dayId,
      bucket: p.bucket,
      transactionType: p.type,
      direction: p.dir,
      amount: p.amount,
      balanceAfter: nb,
      businessDate: p.date,
      description: p.desc,
      relatedEntityType: p.entityType || null,
      relatedEntityId: p.entityId || null,
      reversalOfId: p.reversalOf || null,
      note: p.note || null,
      createdByUserId: p.userId || null,
    },
  });
  await p.prisma.incomeAllocationDay.update({
    where: { id: p.dayId },
    data: { [closingField(p.bucket)]: nb },
  });
  return tx;
}

export async function ensureAllocationDay(bd: Date, prisma: any) {
  let ex = await prisma.incomeAllocationDay.findUnique({ where: { businessDate: bd }, include: { transactions: true } });
  const gross = await getEligibleIncomeForDate(bd, prisma);
  
  if (ex) {
    const delta = f3(gross - ex.grossEligibleIncome);
    if (delta > 0) {
      const pA = f3(delta * ex.purchasePct / 100);
      const mA = f3(delta * ex.maintenancePct / 100);
      const lA = f3(delta * ex.laborPct / 100);
      const cA = f3(delta * ex.capitalPct / 100);
      
      const items = [
        { bucket: 'PURCHASE_DEVELOPMENT', amount: pA },
        { bucket: 'MAINTENANCE', amount: mA },
        { bucket: 'LABOR', amount: lA },
        { bucket: 'CAPITAL', amount: cA },
      ];
      for (const b of items) {
        if (b.amount <= 0) continue;
        await recordTx({
          prisma, dayId: ex.id, bucket: b.bucket, type: 'DAILY_ALLOCATION', dir: 'CREDIT',
          amount: b.amount, date: bd, desc: `تحديث مبيعات`,
          entityType: 'ALLOCATION_DAY', entityId: ex.id + '_upd_' + Date.now()
        });
      }
      
      await prisma.incomeAllocationDay.update({
        where: { id: ex.id },
        data: {
          grossEligibleIncome: gross,
          purchaseAllocated: f3(ex.purchaseAllocated + pA),
          maintenanceAllocated: f3(ex.maintenanceAllocated + mA),
          laborAllocated: f3(ex.laborAllocated + lA),
          capitalAllocated: f3(ex.capitalAllocated + cA),
        }
      });
      ex = await prisma.incomeAllocationDay.findUnique({ where: { id: ex.id }, include: { transactions: true } });
    }
    return ex;
  }
  
  const [prev, rule] = await Promise.all([
    getPrevBalances(bd, prisma),
    getActiveRule(bd, prisma),
  ]);
  const pA = f3(gross * rule.purchasePct / 100);
  const mA = f3(gross * rule.maintenancePct / 100);
  const lA = f3(gross * rule.laborPct / 100);
  const cA = f3(gross * rule.capitalPct / 100);
  return prisma.$transaction(async (tx: any) => {
    const day = await tx.incomeAllocationDay.create({
      data: {
        businessDate: bd, status: 'OPEN', grossEligibleIncome: gross,
        purchaseOpeningBal: prev.purchaseClosingBal, maintenanceOpeningBal: prev.maintenanceClosingBal,
        laborOpeningBal: prev.laborClosingBal, capitalOpeningBal: prev.capitalClosingBal,
        purchasePct: rule.purchasePct, maintenancePct: rule.maintenancePct, laborPct: rule.laborPct, capitalPct: rule.capitalPct,
        purchaseAllocated: pA, maintenanceAllocated: mA, laborAllocated: lA, capitalAllocated: cA,
        purchaseClosingBal: f3(prev.purchaseClosingBal + pA),
        maintenanceClosingBal: f3(prev.maintenanceClosingBal + mA),
        laborClosingBal: f3(prev.laborClosingBal + lA),
        capitalClosingBal: f3(prev.capitalClosingBal + cA),
        ruleId: rule.id,
      },
    });
    const items = [
      { bucket: 'PURCHASE_DEVELOPMENT', amount: pA, bal: f3(prev.purchaseClosingBal + pA) },
      { bucket: 'MAINTENANCE', amount: mA, bal: f3(prev.maintenanceClosingBal + mA) },
      { bucket: 'LABOR', amount: lA, bal: f3(prev.laborClosingBal + lA) },
      { bucket: 'CAPITAL', amount: cA, bal: f3(prev.capitalClosingBal + cA) },
    ];
    for (const b of items) {
      if (b.amount <= 0) continue;
      await tx.incomeAllocationTransaction.create({
        data: {
          allocationDayId: day.id, bucket: b.bucket, transactionType: 'DAILY_ALLOCATION',
          direction: 'CREDIT', amount: b.amount, balanceAfter: b.bal, businessDate: bd,
          description: `حصة دخل اليوم (${rule.purchasePct}/${rule.maintenancePct}/${rule.laborPct}/${rule.capitalPct}%)`,
          relatedEntityType: 'ALLOCATION_DAY', relatedEntityId: day.id,
        },
      });
    }
    return tx.incomeAllocationDay.findUnique({ where: { id: day.id }, include: { transactions: true } });
  });
}

export async function createExpenseAllocation(p: any) {
  const bd = toBusinessDate(p.businessDate);
  const ex = await p.prisma.incomeAllocationTransaction.findFirst({ where: { relatedEntityType: 'EXPENSE', relatedEntityId: p.expenseId, bucket: p.bucket, transactionType: 'EXPENSE' } });
  if (ex) return ex;
  const day = await ensureAllocationDay(bd, p.prisma);
  return recordTx({ prisma: p.prisma, dayId: day.id, bucket: p.bucket, type: 'EXPENSE', dir: 'DEBIT', amount: p.amount, date: bd, desc: p.description, entityType: 'EXPENSE', entityId: p.expenseId, userId: p.createdByUserId });
}

export async function createPayrollAllocation(p: any) {
  const bd = toBusinessDate(p.businessDate);
  const ex = await p.prisma.incomeAllocationTransaction.findFirst({ where: { relatedEntityType: 'PAYROLL', relatedEntityId: p.payrollId, bucket: 'LABOR', transactionType: 'PAYROLL' } });
  if (ex) return ex;
  const day = await ensureAllocationDay(bd, p.prisma);
  return recordTx({ prisma: p.prisma, dayId: day.id, bucket: 'LABOR', type: 'PAYROLL', dir: 'DEBIT', amount: p.amount, date: bd, desc: 'راتب: ' + p.employeeName, entityType: 'PAYROLL', entityId: p.payrollId, userId: p.createdByUserId });
}

export async function createProfitDistributionAllocation(p: any) {
  const bd = toBusinessDate(p.businessDate);
  const ex = await p.prisma.incomeAllocationTransaction.findFirst({ where: { relatedEntityType: 'PROFIT_DISTRIBUTION', relatedEntityId: p.distributionId, bucket: 'CAPITAL', transactionType: 'PROFIT_DISTRIBUTION' } });
  if (ex) return ex;
  const day = await ensureAllocationDay(bd, p.prisma);
  return recordTx({ prisma: p.prisma, dayId: day.id, bucket: 'CAPITAL', type: 'PROFIT_DISTRIBUTION', dir: 'DEBIT', amount: p.amount, date: bd, desc: 'توزيع أرباح على المستثمرين', entityType: 'PROFIT_DISTRIBUTION', entityId: p.distributionId, userId: p.createdByUserId });
}

export async function createManualAdjustment(p: any) {
  const bd = toBusinessDate(p.businessDate);
  const day = await ensureAllocationDay(bd, p.prisma);
  return recordTx({ prisma: p.prisma, dayId: day.id, bucket: p.bucket, type: 'MANUAL_ADJUSTMENT', dir: p.direction, amount: p.amount, date: bd, desc: p.reason, note: p.note, userId: p.createdByUserId });
}

export async function reverseAllocationTransaction(p: any) {
  const orig = await p.prisma.incomeAllocationTransaction.findUnique({ where: { id: p.originalTransactionId } });
  if (!orig) throw new Error('الحركة الأصلية غير موجودة');
  const exRev = await p.prisma.incomeAllocationTransaction.findFirst({ where: { reversalOfId: p.originalTransactionId } });
  if (exRev) throw new Error('هذه الحركة تم عكسها مسبقاً');
  const bd = toBusinessDate(new Date());
  const day = await ensureAllocationDay(bd, p.prisma);
  const revDir = orig.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT';
  return recordTx({ prisma: p.prisma, dayId: day.id, bucket: orig.bucket, type: 'REVERSAL', dir: revDir, amount: orig.amount, date: bd, desc: 'عكس: ' + orig.description + ' — ' + p.reason, entityType: orig.relatedEntityType, entityId: orig.relatedEntityId, note: p.reason, userId: p.createdByUserId, reversalOf: p.originalTransactionId });
}

export async function getAllocationSummary(params: any) {
  const { from, to, prisma } = params;
  const days = await prisma.incomeAllocationDay.findMany({ where: { businessDate: { gte: from, lte: to } }, include: { transactions: true }, orderBy: { businessDate: 'asc' } });
  const first = days[0]; const last = days[days.length - 1];
  const opening = first ? { purchase: first.purchaseOpeningBal, maintenance: first.maintenanceOpeningBal, labor: first.laborOpeningBal, capital: first.capitalOpeningBal } : { purchase: 0, maintenance: 0, labor: 0, capital: 0 };
  const closing = last ? { purchase: last.purchaseClosingBal, maintenance: last.maintenanceClosingBal, labor: last.laborClosingBal, capital: last.capitalClosingBal } : { purchase: 0, maintenance: 0, labor: 0, capital: 0 };
  let totalIncome = 0;
  const buckets: any = { PURCHASE_DEVELOPMENT: { allocated: 0, spent: 0, adjustments: 0 }, MAINTENANCE: { allocated: 0, spent: 0, adjustments: 0 }, LABOR: { allocated: 0, spent: 0, adjustments: 0 }, CAPITAL: { allocated: 0, spent: 0, adjustments: 0 } };
  for (const day of days) {
    totalIncome += day.grossEligibleIncome;
    for (const tx of day.transactions) {
      const b = buckets[tx.bucket]; if (!b) continue;
      if (tx.transactionType === 'DAILY_ALLOCATION') b.allocated += tx.amount;
      else if (['EXPENSE', 'PAYROLL', 'PROFIT_DISTRIBUTION'].includes(tx.transactionType)) b.spent += tx.amount;
      else if (tx.transactionType === 'MANUAL_ADJUSTMENT') b.adjustments += tx.direction === 'CREDIT' ? tx.amount : -tx.amount;
      else if (tx.transactionType === 'REVERSAL') { if (tx.direction === 'CREDIT') b.spent -= tx.amount; else b.spent += tx.amount; }
    }
  }
  return { totalIncome, openingBalances: opening, closingBalances: closing, buckets, days: days.map((d: any) => ({ id: d.id, businessDate: d.businessDate, grossEligibleIncome: d.grossEligibleIncome, status: d.status, purchaseAllocated: d.purchaseAllocated, maintenanceAllocated: d.maintenanceAllocated, laborAllocated: d.laborAllocated, capitalAllocated: d.capitalAllocated, purchaseClosingBal: d.purchaseClosingBal, maintenanceClosingBal: d.maintenanceClosingBal, laborClosingBal: d.laborClosingBal, capitalClosingBal: d.capitalClosingBal })) };
}
// Trigger Railway deployment 1
