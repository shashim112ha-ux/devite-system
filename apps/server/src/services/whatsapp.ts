import PDFDocument from 'pdfkit';
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

  whatsappClient.initialize();
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
