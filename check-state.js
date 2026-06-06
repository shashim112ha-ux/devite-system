const fs = require('fs');
const lines = fs.readFileSync('d:/devite/apps/web/src/app/payroll/page.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('const [noteVal, setNoteVal] = useState("");'));
console.log(lines.slice(start - 5, start + 10).join('\n'));
