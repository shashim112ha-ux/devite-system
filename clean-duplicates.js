const fs = require('fs');
const path = 'd:/devite/apps/server/src/router.ts';
let content = fs.readFileSync(path, 'utf8');

// Find the duplicated part
const marker1 = "    });\n      if (!existing) throw new Error";
const marker2 = "    }),\n\n  approvePayroll: managerProcedure";
const idx1 = content.indexOf(marker1);
if (idx1 !== -1) {
  const nextApprove = content.indexOf(marker2, idx1);
  if (nextApprove !== -1) {
    content = content.substring(0, idx1) + "    }),\n\n  approvePayroll: managerProcedure" + content.substring(nextApprove + marker2.length);
    fs.writeFileSync(path, content);
    console.log("Cleaned duplicates!");
  } else {
    console.log("Could not find next approvePayroll");
  }
} else {
  console.log("Could not find marker1");
}
