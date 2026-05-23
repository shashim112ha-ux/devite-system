/**
 * خدمة الواتساب المتكاملة لـ DEVITE
 * ----------------------------------------
 * هذا الملف يحتوي على البنية الكاملة لنظام الواتساب.
 * الإرسال الفعلي عبر Meta API معلّق (stub) - يمكن ربطه لاحقاً بإضافة Access Token و Phone Number ID.
 */

import PDFDocument from 'pdfkit';

// =========================================
// القوالب الافتراضية (تُستبدل من قاعدة البيانات)
// =========================================
export const DEFAULT_TEMPLATES: Record<string, { name: string; body: string; variables: string }> = {
  ORDER_CREATED: {
    name: 'استلام الطلب',
    body: `مرحباً {customerName} 👋
تم استلام طلبك رقم #{orderNumber} ✅
الوقت المتوقع للجاهزية: {estimatedTime} دقيقة ⏱️
شكراً لاختيارك DEVITE! 🧃`,
    variables: '{customerName},{orderNumber},{estimatedTime}'
  },
  ORDER_READY: {
    name: 'جاهزية الطلب',
    body: `طلبك رقم #{orderNumber} جاهز الآن للاستلام 🎉
شكراً لك - نتمنى لك وقتاً ممتعاً! ☕
DEVITE`,
    variables: '{orderNumber}'
  },
  ORDER_CANCELLED: {
    name: 'إلغاء الطلب',
    body: `نعتذر منك 🙏
تم إلغاء طلبك رقم #{orderNumber}.
للاستفسار يرجى التواصل مع الإدارة.
DEVITE`,
    variables: '{orderNumber}'
  },
  SHIFT_REPORT: {
    name: 'تقرير نهاية الشفت',
    body: `📋 *تقرير نهاية الشفت*
الشفت: {shiftName}
الموظف المسؤول: {managerName}

💰 *التسوية المالية:*
- الكاش: {cashTotal} د.ب
- الأونلاين: {onlineTotal} د.ب
- المصروفات: {expenses} د.ب
- صافي الربح: {netProfit} د.ب

🚗 *حالة العربة:*
- النظافة: {cleanliness}
- الثلاجة: {fridgeStatus}
- آلة الثلج: {iceMachineStatus}
- المياه: {waterStatus}
- البترول: {fuelStatus}

الحالة: {status}`,
    variables: '{shiftName},{managerName},{cashTotal},{onlineTotal},{expenses},{netProfit},{cleanliness},{fridgeStatus},{iceMachineStatus},{waterStatus},{fuelStatus},{status}'
  },
  DAILY_REPORT: {
    name: 'التقرير اليومي',
    body: `📊 *تقرير DEVITE اليومي*
التاريخ: {date}

💵 إجمالي المبيعات: {sales} د.ب
💸 إجمالي المصروفات: {expenses} د.ب
✅ صافي الربح: {netProfit} د.ب
📦 عدد الطلبات: {ordersCount}
🏆 أكثر صنف مبيعاً: {topProduct}
📉 نسبة المصروفات: {expenseRatio}%`,
    variables: '{date},{sales},{expenses},{netProfit},{ordersCount},{topProduct},{expenseRatio}'
  },
  LOW_INVENTORY: {
    name: 'تنبيه نقص المخزون',
    body: `⚠️ *تنبيه مخزون*
المادة: {itemName}
الكمية الحالية: {currentQuantity} {unit}
الحد الأدنى: {minimumQuantity} {unit}

يرجى إعادة الشراء فوراً.
DEVITE System`,
    variables: '{itemName},{currentQuantity},{unit},{minimumQuantity}'
  },
  LARGE_EXPENSE: {
    name: 'تنبيه مصروف كبير',
    body: `🚨 *تنبيه مصروف كبير*
الغرض: {expensePurpose}
المبلغ: {amount} د.ب
الموظف: {employeeName}
الحساب المستخدم: {accountName}
المورد: {supplierName}

يرجى المراجعة والاعتماد.
DEVITE System`,
    variables: '{expensePurpose},{amount},{employeeName},{accountName},{supplierName}'
  },
  INVESTOR_REPORT: {
    name: 'تقرير المستثمر',
    body: `📈 *تقرير المستثمر*
الاسم: {investorName}
الفترة: {period}

💼 رأس المال: {capital} د.ب
📊 نسبة الحصة: {sharePercentage}%
💰 الأرباح المستحقة: {profit} د.ب
➖ الاستقطاعات: {deductions} د.ب
✅ الصافي: {netInvestorProfit} د.ب

DEVITE System`,
    variables: '{investorName},{period},{capital},{sharePercentage},{profit},{deductions},{netInvestorProfit}'
  }
};

// =========================================
// دوال توليد الـ PDF (باستخدام pdfkit)
// =========================================
export async function generateShiftReportPDF(report: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).fillColor('#e07b39').text('DEVITE - Shift Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#000').text(`Date: ${new Date(report.date).toLocaleDateString('en-GB')}`, { align: 'center' });
    doc.text(`Cashier: ${report.cashier?.name || 'N/A'}`, { align: 'center' });
    doc.moveDown();

    // Financial
    doc.fontSize(14).fillColor('#e07b39').text('Financial Summary');
    doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke('#e07b39');
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#000');
    doc.text(`Sales: ${report.profit?.toFixed(3)} BD`);
    doc.text(`Expenses: ${report.expenses?.toFixed(3)} BD`);
    doc.text(`Losses: ${report.losses?.toFixed(3)} BD`);
    doc.text(`Cash: ${report.cashAmount?.toFixed(3)} BD`);
    doc.text(`Card: ${report.cardAmount?.toFixed(3)} BD`);
    doc.text(`Net Profit: ${report.netProfit?.toFixed(3)} BD`);
    doc.text(`Difference: ${report.difference?.toFixed(3)} BD`);
    doc.moveDown();

    // Checklist
    doc.fontSize(14).fillColor('#e07b39').text('Equipment & Supplies Check');
    doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke('#e07b39');
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#000');
    doc.text(`Internal Cleanliness: ${report.cleanlinessInternal ? '✓ OK' : '✗ Needs Attention'}`);
    doc.text(`External Cleanliness: ${report.cleanlinessExternal ? '✓ OK' : '✗ Needs Attention'}`);
    doc.text(`Fridge: ${report.fridgeStatus ? '✓ OK' : '✗ Issue'}`);
    doc.text(`Ice Machine: ${report.iceMachineStatus ? '✓ OK' : '✗ Issue'}`);
    doc.text(`Blender: ${report.blenderStatus ? '✓ OK' : '✗ Issue'}`);
    doc.text(`Electricity: ${report.electricityStatus ? '✓ OK' : '✗ Issue'}`);
    doc.text(`Water (In/Out): ${report.waterInternal}L / ${report.waterExternal}L`);
    doc.text(`Petrol: ${report.petrolQuantity}L | Gas: ${report.gasQuantity} lbs`);
    doc.text(`Cups: ${report.cupsQuantity} | Lids: ${report.lidsQuantity}`);
    doc.text(`Napkins: ${report.napkinsQuantity} | Gloves: ${report.glovesQuantity}`);
    doc.moveDown();

    // Staff
    doc.fontSize(14).fillColor('#e07b39').text('Attendance & Stats');
    doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke('#e07b39');
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#000');
    doc.text(`Present: ${report.presentStaff || 'N/A'}`);
    doc.text(`Absent: ${report.absentStaff || 'None'}`);
    doc.text(`Late: ${report.lateStaff || 'None'}`);
    doc.text(`Orders: ${report.ordersCount} | Cancelled: ${report.cancelledOrdersCount}`);
    doc.text(`Avg Prep Time: ${report.avgPrepTime} min`);

    if (report.notes) {
      doc.moveDown();
      doc.fontSize(14).fillColor('#e07b39').text('Notes');
      doc.fontSize(11).fillColor('#000').text(report.notes);
    }

    doc.end();
  });
}

// =========================================
// دوال بناء نصوص الرسائل (مع استبدال المتغيرات)
// =========================================
export function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}

// =========================================
// STUB: دالة الإرسال الفعلي عبر Meta API
// =========================================
export async function sendWhatsAppMessage(
  to: string,
  body: string,
  accessToken: string,
  phoneNumberId: string
): Promise<{ success: boolean; error?: string }> {
  /**
   * TODO: هنا يتم الإرسال الفعلي عبر Meta WhatsApp Cloud API
   * يجب عليك إضافة:
   * - accessToken من Meta Developer Console
   * - phoneNumberId من WhatsApp Business Account
   *
   * مثال على الإرسال:
   * const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
   *   method: 'POST',
   *   headers: {
   *     'Authorization': `Bearer ${accessToken}`,
   *     'Content-Type': 'application/json'
   *   },
   *   body: JSON.stringify({
   *     messaging_product: 'whatsapp',
   *     to: to,
   *     type: 'text',
   *     text: { body }
   *   })
   * });
   */

  if (!accessToken || !phoneNumberId) {
    return { success: false, error: 'Meta API credentials not configured. Please add Access Token and Phone Number ID in WhatsApp Settings.' };
  }

  // عندما يتم الربط بـ Meta، احذف هذا الكود وأضف الفيتش أعلاه
  return { success: false, error: 'Meta API not yet connected - Please configure in WhatsApp Settings.' };
}

// =========================================
// دالة وضع الرسالة في الطابور (Queue)
// =========================================
export async function queueWhatsAppMessage(
  prisma: any,
  recipient: string,
  messageType: string,
  body: string,
  userId?: string
): Promise<void> {
  try {
    if (!recipient || recipient.trim() === '') return;
    await prisma.whatsAppLog.create({
      data: {
        recipient: recipient.trim(),
        messageType,
        body,
        status: 'PENDING',
        userId: userId || null
      }
    });
  } catch (e) {
    console.error('[WhatsApp Queue] Failed to queue message:', e);
  }
}

// =========================================
// دالة معالجة الطابور (تُستدعى كل دقيقة)
// =========================================
export async function processWhatsAppQueue(prisma: any): Promise<void> {
  try {
    const settings = await prisma.whatsAppSettings.findUnique({ where: { id: 'default' } });
    if (!settings?.isEnabled || !settings?.accessToken || !settings?.phoneNumberId) return;

    const pending = await prisma.whatsAppLog.findMany({
      where: { status: 'PENDING', attempts: { lt: 3 } },
      take: 10
    });

    for (const log of pending) {
      const result = await sendWhatsAppMessage(log.body, log.recipient, settings.accessToken, settings.phoneNumberId);
      if (result.success) {
        await prisma.whatsAppLog.update({
          where: { id: log.id },
          data: { status: 'SENT', sentAt: new Date(), attempts: log.attempts + 1 }
        });
      } else {
        const newAttempts = log.attempts + 1;
        await prisma.whatsAppLog.update({
          where: { id: log.id },
          data: {
            attempts: newAttempts,
            status: newAttempts >= 3 ? 'FAILED' : 'PENDING',
            errorMessage: result.error
          }
        });
      }
    }
  } catch (e) {
    console.error('[WhatsApp Queue] Processing error:', e);
  }
}
