const fs = require('fs');
const path = 'd:/devite/apps/server/src/router.ts';
let content = fs.readFileSync(path, 'utf8');

// Find the end of correct updatePayrollDraft
const startMatch = content.match(/          editReason: input\.editReason \?\? existing\.editReason\r?\n        \}\r?\n      \}\);\r?\n    \}\),\r?\n/);
if (startMatch) {
  const startIdx = startMatch.index + startMatch[0].length;
  // It is followed by "      if (!existing) throw new Error"
  const endMatch = content.indexOf('  approvePayroll: managerProcedure', startIdx);
  if (endMatch !== -1) {
    content = content.substring(0, startIdx) + "\n" + content.substring(endMatch);
    fs.writeFileSync(path, content);
    console.log("Removed duplicate successfully");
  } else {
    console.log("Could not find approvePayroll");
  }
} else {
  console.log("Could not find startMatch");
}
