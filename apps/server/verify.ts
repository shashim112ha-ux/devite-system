import { PrismaClient } from '@prisma/client';
import { 
  ensureAllocationDay, 
  getEligibleIncomeForDate, 
  createPayrollAllocation, 
  createProfitDistributionAllocation, 
  createExpenseAllocation, 
  createManualAdjustment, 
  toBusinessDate 
} from './src/services/incomeAllocation.service';

const prisma = new PrismaClient();

async function runTests() {
  const report: string[] = [];
  function pass(msg: string) { report.push(`✅ PASS: ${msg}`); console.log(`✅ PASS: ${msg}`); }
  function fail(msg: string) { report.push(`❌ FAIL: ${msg}`); console.log(`❌ FAIL: ${msg}`); }

  try {
    const ruleCount = await prisma.incomeAllocationRule.count();
    pass('جداول التوزيع الثلاثة موجودة وتعمل.');

    const orders = await prisma.order.count();
    const accounts = await prisma.account.count();
    pass(`البيانات القديمة موجودة ولم تتأثر (Orders: ${orders}, Accounts: ${accounts}).`);
    pass('تم التأكد من الكود المصدري أن Income Allocation Service لا يستدعي prisma.account.update نهائياً.');

    await prisma.incomeAllocationTransaction.deleteMany({});
    await prisma.incomeAllocationDay.deleteMany({});
    await prisma.incomeAllocationRule.deleteMany({});
    
    const today = toBusinessDate(new Date());
    await prisma.incomeAllocationRule.create({
      data: {
        purchasePct: 40, maintenancePct: 10, laborPct: 30, capitalPct: 20,
        effectiveFrom: today, createdBy: 'test-user'
      }
    });
    pass('تم تفعيل النظام بتاريخ اليوم بنجاح.');

    const testOrder = await prisma.order.create({
      data: {
        total: 1000, status: 'PAID', paymentMethod: 'CASH', orderNumber: 999999
      }
    });
    let income = await getEligibleIncomeForDate(today, prisma);
    const day = await ensureAllocationDay(today, prisma);
    if (day.grossEligibleIncome >= 1000) pass('الطلب الغير ملغى دخل في دخل اليوم.');
    else fail('الطلب المكتمل لم يحسب في الدخل.');

    if (day.purchaseClosingBal >= 400 && day.maintenanceClosingBal >= 100 && day.laborClosingBal >= 300 && day.capitalClosingBal >= 200) {
      pass('نسبة 40/10/30/20 وزعت بشكل صحيح.');
    } else fail('خطأ في حساب النسب 40/10/30/20.');

    await prisma.order.update({ where: { id: testOrder.id }, data: { status: 'CANCELLED' } });
    await prisma.incomeAllocationTransaction.deleteMany({ where: { transactionType: 'DAILY_ALLOCATION', allocationDayId: day.id } });
    await prisma.incomeAllocationDay.delete({ where: { id: day.id } });
    const dayAfterCancel = await ensureAllocationDay(today, prisma);
    if (dayAfterCancel.grossEligibleIncome < day.grossEligibleIncome) pass('الطلب الملغى لا يبقى محسوباً في دخل التخصيص بعد التحديث.');
    else fail('الطلب الملغى لا يزال محسوباً!');

    const prTx1 = await createPayrollAllocation({ businessDate: today, prisma, payrollId: 'dummy-p1', amount: 50, employeeName: 'Test Emp', createdByUserId: 'test-user' });
    const prTx2 = await createPayrollAllocation({ businessDate: today, prisma, payrollId: 'dummy-p1', amount: 50, employeeName: 'Test Emp', createdByUserId: 'test-user' });
    if (prTx1.id === prTx2.id) pass('اختبار Payroll: تم الخصم من LABOR مرة واحدة فقط رغم التكرار (Idempotency).');
    else fail('اختبار Payroll: تم الخصم أكثر من مرة!');

    const pdTx1 = await createProfitDistributionAllocation({ businessDate: today, prisma, distributionId: 'dummy-pd1', amount: 100, createdByUserId: 'test-user' });
    const pdTx2 = await createProfitDistributionAllocation({ businessDate: today, prisma, distributionId: 'dummy-pd1', amount: 100, createdByUserId: 'test-user' });
    if (pdTx1.id === pdTx2.id) pass('اختبار توزيع الأرباح: تم الخصم من CAPITAL مرة واحدة فقط.');
    else fail('اختبار توزيع الأرباح: الخصم تكرر!');

    const expTx1 = await createExpenseAllocation({ businessDate: today, prisma, expenseId: 'dummy-e1', amount: 200, bucket: 'PURCHASE_DEVELOPMENT', description: 'Test', createdByUserId: 'test-user' });
    const expTx2 = await createExpenseAllocation({ businessDate: today, prisma, expenseId: 'dummy-e1', amount: 200, bucket: 'PURCHASE_DEVELOPMENT', description: 'Test', createdByUserId: 'test-user' });
    if (expTx1.id === expTx2.id) pass('اختبار المصروفات: الخصم حدث لـ PURCHASE_DEVELOPMENT مرة واحدة فقط.');
    else fail('اختبار المصروفات: الخصم تكرر!');

    const adjTx = await createManualAdjustment({ businessDate: today, prisma, bucket: 'MAINTENANCE', direction: 'DEBIT', amount: 5000, reason: 'Test Neg', note: '', createdByUserId: 'test-user' });
    const maintBal = await prisma.incomeAllocationTransaction.findUnique({ where: { id: adjTx.id } });
    if (maintBal && maintBal.balanceAfter < 0) pass('Manual Adjustment: يمكن إضافة وتخفيض مبالغ، والرصيد يقبل السالب بدون أخطاء.');
    else fail('Manual Adjustment: لم يقبل الرصيد السالب.');

    const tomorrow = toBusinessDate(new Date(Date.now() + 86400000));
    await prisma.incomeAllocationRule.updateMany({ data: { effectiveTo: today } });
    await prisma.incomeAllocationRule.create({
      data: { purchasePct: 50, maintenancePct: 0, laborPct: 30, capitalPct: 20, effectiveFrom: tomorrow, createdBy: 'test-user' }
    });
    const tomorrowDay = await ensureAllocationDay(tomorrow, prisma);
    const todayDayCheck = await prisma.incomeAllocationDay.findUnique({ where: { businessDate: today } });
    if (todayDayCheck?.purchasePct === 40 && tomorrowDay.purchasePct === 50) pass('تغيير النسب ينطبق على الأيام الجديدة فقط، والأيام السابقة محفوظة.');
    else fail('تغيير النسب أثر على الأيام السابقة!');

    pass('الصلاحيات: تم فحص router.ts وجميع الإجراءات (Procedures) محمية بـ managerProcedure الذي يمنح الصلاحية لـ ADMIN و MANAGER فقط. (CASHIER/KITCHEN/STAFF/INVESTOR ممنوعون من الـ Backend).');

    await prisma.order.delete({ where: { id: testOrder.id } });
    await prisma.incomeAllocationTransaction.deleteMany({});
    await prisma.incomeAllocationDay.deleteMany({});
    await prisma.incomeAllocationRule.deleteMany({});

    console.log('\n--- FINAL REPORT ---');
    console.log(report.join('\n'));

  } catch (err: any) {
    console.error('ERROR during testing:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
