const fs = require('fs');
const path = 'd:/devite/apps/server/prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('editReason')) {
  content = content.replace(
    /notes\s+String\?/g,
    'notes         String?\n    editReason    String?'
  );
  fs.writeFileSync(path, content);
  console.log('Added editReason to schema');
} else {
  console.log('editReason already exists');
}
