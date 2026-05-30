import puppeteer from 'puppeteer';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode';

// =========================================
// WhatsApp Client Instance
// =========================================
export let whatsappClient: Client | null = null;
export let whatsappStatus: 'DISCONNECTED' | 'QR_READY' | 'CONNECTED' = 'DISCONNECTED';
export let whatsappQR: string | null = null;

export function initWhatsAppClient() {
  if (whatsappClient) return;
  whatsappStatus = 'DISCONNECTED';
  whatsappQR = null;

  whatsappClient = new Client({
    authStrategy: new LocalAuth({ clientId: 'devite-erp' }),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] }
  });

  whatsappClient.on('qr', async (qr) => {
    whatsappStatus = 'QR_READY';
    whatsappQR = await qrcode.toDataURL(qr);
    console.log('[WhatsApp] QR Code Ready. Please scan from the Settings page.');
  });

  whatsappClient.on('ready', () => {
    whatsappStatus = 'CONNECTED';
    whatsappQR = null;
    console.log('[WhatsApp] Client is ready and connected!');
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('[WhatsApp] Client was disconnected', reason);
    whatsappStatus = 'DISCONNECTED';
    whatsappQR = null;
    // Client automatically tries to reconnect, but we can clear it and re-init if needed
    whatsappClient?.destroy();
    whatsappClient = null;
    setTimeout(initWhatsAppClient, 5000);
  });

  whatsappClient.initialize().catch(err => {
    console.error('[WhatsApp] Failed to initialize:', err.message);
    whatsappStatus = 'DISCONNECTED';
  });
}

// Call this once on server startup
initWhatsAppClient();

export function getWhatsAppState() {
  return {
    status: whatsappStatus,
    qr: whatsappQR
  };
}

export function restartWhatsApp() {
  if (whatsappClient) {
    whatsappClient.destroy();
    whatsappClient = null;
  }
  whatsappStatus = 'DISCONNECTED';
  whatsappQR = null;
  initWhatsAppClient();
}


// =========================================
// Default Templates
// =========================================
export const DEFAULT_TEMPLATES: Record<string, { name: string; body: string; variables: string }> = {
  ORDER_CREATED: {
    name: 'طلب جديد',
    body: `مرحباً {customerName} 👋
تم استلام طلبك رقم #{orderNumber} 🧾
الوقت المتوقع للتحضير: {estimatedTime} دقيقة ⏳
شكراً لاختيارك DEVITE! 🚀`,
    variables: '{customerName},{orderNumber},{estimatedTime}'
  },
  ORDER_READY: {
    name: 'طلب جاهز',
    body: `طلبك رقم #{orderNumber} جاهز الآن للاستلام! 🎉
تفضل - نتمنى لك وجبة شهية! 🍽️
DEVITE`,
    variables: '{orderNumber}'
  },
  ORDER_CANCELLED: {
    name: 'طلب ملغي',
    body: `عذراً 😔
تم إلغاء طلبك رقم #{orderNumber}.
سنتواصل معك قريباً أو يمكنك زيارتنا.
DEVITE`,
    variables: '{orderNumber}'
  },
  SHIFT_REPORT: {
    name: 'تقرير نهاية الشفت',
    body: `📊 *تقرير نهاية الشفت*
الشفت: {shiftName}
مدير الشفت: {managerName}

💰 *الملخص المالي:*
- كاش: {cashTotal} د.ب
- أونلاين: {onlineTotal} د.ب
- مصروفات: {expenses} د.ب
- صافي الربح: {netProfit} د.ب

🧹 *حالة المرافق:*
- النظافة: {cleanliness}

مرفق مع هذه الرسالة التقرير التفصيلي (PDF).`,
    variables: '{shiftName},{managerName},{cashTotal},{onlineTotal},{expenses},{netProfit},{cleanliness}'
  },
  INVESTOR_REPORT: {
    name: 'تقرير المستثمرين (شهري)',
    body: `📈 *تقرير العائد على الاستثمار*
مرحباً {investorName}،
مرفق تقرير أرباحك للفترة: {period}

تفاصيل سريعة:
💼 رأس المال: {capital} د.ب
📊 الحصة: {sharePercentage}%
💰 إجمالي الأرباح: {profit} د.ب
🔻 الاستقطاعات: {deductions} د.ب
✅ صافي الأرباح: {netInvestorProfit} د.ب

DEVITE System`,
    variables: '{investorName},{period},{capital},{sharePercentage},{profit},{deductions},{netInvestorProfit}'
  }
};

// =========================================
// PDF Generator
// =========================================
export async function generateShiftReportPDF(report: any): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير نهاية الشفت</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
          body {
            font-family: 'Cairo', sans-serif;
            margin: 0;
            padding: 40px;
            background-color: #fff;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #e07b39;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #e07b39;
            margin: 0;
            font-size: 28px;
            font-weight: 900;
          }
          .header p {
            margin: 5px 0 0;
            font-size: 16px;
            color: #666;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            color: #e07b39;
            font-size: 20px;
            font-weight: bold;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
            text-align: right;
          }
          th {
            background-color: #f9f9f9;
            color: #555;
          }
          .highlight {
            font-weight: bold;
            color: #e07b39;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>DEVITE - تقرير نهاية الشفت</h1>
          <p>التاريخ: ${new Date(report.date).toLocaleDateString('ar-BH')}</p>
          <p>الكاشير: ${report.cashier?.name || 'غير محدد'}</p>
        </div>

        <div class="section">
          <div class="section-title">الملخص المالي</div>
          <table>
            <tr><th>المبيعات</th><td>${report.profit?.toFixed(3)} د.ب</td></tr>
            <tr><th>المصروفات</th><td>${report.expenses?.toFixed(3)} د.ب</td></tr>
            <tr><th>الخسائر</th><td>${report.losses?.toFixed(3)} د.ب</td></tr>
            <tr><th>النقد (كاش)</th><td>${report.cashAmount?.toFixed(3)} د.ب</td></tr>
            <tr><th>البطاقة (أونلاين)</th><td>${report.cardAmount?.toFixed(3)} د.ب</td></tr>
            <tr><th>صافي الربح</th><td class="highlight">${report.netProfit?.toFixed(3)} د.ب</td></tr>
            <tr><th>عجز / زيادة الصندوق</th><td style="color: ${report.difference < 0 ? 'red' : 'green'}; font-weight: bold;">${report.difference?.toFixed(3)} د.ب</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">حالة العربة والمعدات</div>
          <table>
            <tr><th>النظافة الداخلية</th><td>${report.cleanlinessInternal ? 'ممتازة ✅' : 'تحتاج تنظيف ❌'}</td></tr>
            <tr><th>النظافة الخارجية</th><td>${report.cleanlinessExternal ? 'ممتازة ✅' : 'تحتاج تنظيف ❌'}</td></tr>
            <tr><th>الماء الداخلي</th><td>${report.waterInternal} لتر</td></tr>
            <tr><th>الماء الخارجي</th><td>${report.waterExternal} لتر</td></tr>
            <tr><th>البترول</th><td>${report.petrolQuantity} لتر</td></tr>
            <tr><th>الغاز</th><td>${report.gasQuantity} باوند</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">أدوات الاستهلاك اليومية</div>
          <table>
            <tr><th>الأكواب المتبقية</th><td>${report.cupsQuantity}</td></tr>
            <tr><th>الأغطية المتبقية</th><td>${report.lidsQuantity}</td></tr>
            <tr><th>المناديل المتبقية</th><td>${report.napkinsQuantity}</td></tr>
            <tr><th>القفازات المتبقية</th><td>${report.glovesQuantity}</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">ملاحظات الشفت</div>
          <p style="background: #f9f9f9; padding: 15px; border-radius: 8px; line-height: 1.6;">
            ${report.notes ? report.notes.replace(/\n/g, '<br/>') : 'لا توجد ملاحظات.'}
          </p>
        </div>
        
        <div style="margin-top: 50px; text-align: center; color: #888; font-size: 12px;">
          تم إصدار هذا التقرير آلياً من نظام Devite
        </div>
      </body>
      </html>
    `;
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}

// =========================================
// WhatsApp Sending Function
// =========================================
export async function sendWhatsAppMessage(
  to: string,
  body: string,
  pdfBuffer?: Buffer,
  pdfName?: string
): Promise<{ success: boolean; error?: string }> {
  if (whatsappStatus !== 'CONNECTED' || !whatsappClient) {
    return { success: false, error: 'WhatsApp is not connected. Please scan the QR code in settings.' };
  }

  try {
    // Format phone number to WhatsApp ID format
    let formattedNumber = to.replace(/[^0-9]/g, '');
    if (!formattedNumber.endsWith('@c.us')) {
      formattedNumber = `${formattedNumber}@c.us`;
    }

    if (pdfBuffer && pdfName) {
      const media = new MessageMedia('application/pdf', pdfBuffer.toString('base64'), pdfName);
      await whatsappClient.sendMessage(formattedNumber, body, { media });
    } else {
      await whatsappClient.sendMessage(formattedNumber, body);
    }
    return { success: true };
  } catch (err: any) {
    console.error('[WhatsApp Send Error]:', err);
    return { success: false, error: err.message || 'Failed to send message' };
  }
}

// =========================================
// Queue System
// =========================================
export async function queueWhatsAppMessage(
  prisma: any,
  recipient: string,
  messageType: string,
  body: string,
  userId?: string,
  pdfBufferBase64?: string,
  pdfName?: string
): Promise<void> {
  try {
    if (!recipient || recipient.trim() === '') return;
    await prisma.whatsAppLog.create({
      data: {
        recipient: recipient.trim(),
        messageType,
        body,
        status: 'PENDING',
        userId: userId || null,
        // Optional: save base64 string to a field if your schema supports it,
        // or just rely on direct sending for PDFs and not queuing them if schema doesn't have it.
        // For simplicity we will skip storing PDF in DB for the queue, 
        // in production we might want an S3 link or a dedicated field.
      }
    });
  } catch (e) {
    console.error('[WhatsApp Queue] Failed to queue message:', e);
  }
}

export async function processWhatsAppQueue(prisma: any): Promise<void> {
  try {
    const settings = await prisma.whatsAppSettings.findUnique({ where: { id: 'default' } });
    if (!settings?.isEnabled) return;
    
    if (whatsappStatus !== 'CONNECTED') return; // Don't process if disconnected

    const pending = await prisma.whatsAppLog.findMany({
      where: { status: 'PENDING', attempts: { lt: 3 } },
      take: 10
    });

    for (const log of pending) {
      const result = await sendWhatsAppMessage(log.recipient, log.body);
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
