const fs = require('fs');
const path = 'd:/devite/apps/server/src/router.ts';
let content = fs.readFileSync(path, 'utf8');

const marker = "        data: {\r\n          bonuses,\r\n          manualDeductions,\r\n          advances,\r\n          netSalary,\r\n          notes: input.notes ?? existing.notes,\r\n          editReason: input.editReason ?? existing.editReason\r\n        }\r\n      });\r\n    });";

const searchIdx = content.indexOf("        data: {");
console.log("Found data: { at", searchIdx);

const endOfCorrect = content.indexOf("    });", searchIdx);
console.log("Found }); at", endOfCorrect);

const startOfApprove = content.indexOf("approvePayroll", endOfCorrect);
console.log("Found approvePayroll at", startOfApprove);

if (endOfCorrect !== -1 && startOfApprove !== -1) {
   content = content.substring(0, endOfCorrect + 7) + "\n\n  approvePayroll" + content.substring(startOfApprove + 14);
   fs.writeFileSync(path, content);
   console.log("Removed duplicate manually");
} else {
   console.log("Could not find markers manually");
}
