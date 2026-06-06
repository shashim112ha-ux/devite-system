const fs = require('fs');
const path = 'd:/devite/apps/server/src/router.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /const order = await tx\.order\.create\(\{[\s\S]*?\}\);/m;
const match = code.match(regex);
if (match) {
  const inject = 
          // User Request: Automatically add order money to the dedicated wallet (Account)
          const targetType = input.paymentMethod === 'CARD' ? 'CARD' : 'CASH';
          let targetAccount = await tx.account.findFirst({
            where: { type: targetType, isActive: true }
          });
          if (!targetAccount) {
            targetAccount = await tx.account.findFirst({
               where: { isActive: true }
            });
          }
          if (targetAccount) {
            await tx.account.update({
              where: { id: targetAccount.id },
              data: { balance: { increment: input.total } }
            });
            await tx.transaction.create({
              data: {
                accountId: targetAccount.id,
                type: 'INCOME',
                amount: input.total,
                description: \إيراد طلب زبون رقم \ (\)\,
                date: new Date()
              }
            });
          }
  ;
  code = code.replace(match[0], match[0] + inject);
  fs.writeFileSync(path, code);
  console.log('Injected wallet logic into router.ts');
} else {
  console.log('Could not find order.create block');
}
