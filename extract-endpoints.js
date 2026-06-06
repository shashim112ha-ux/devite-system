const fs = require('fs');
const lines = fs.readFileSync('C:/Users/shash/.gemini/antigravity/brain/19ad0c29-32c0-4cd5-a128-ae31ca848815/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');
let diffBlock = '';
for (let i = lines.length - 1; i >= 0; i--) {
  if (!lines[i]) continue;
  try {
    const d = JSON.parse(lines[i]);
    if (d.step_index === 8357) {
       diffBlock = d.content;
       break;
    }
  } catch(e){}
}

if (diffBlock) {
  const diffLines = diffBlock.split('\n');
  let extracted = [];
  let inDiff = false;
  for (let l of diffLines) {
    if (l === '[diff_block_start]') {
      inDiff = true; continue;
    }
    if (l === '[diff_block_end]') {
      inDiff = false; break;
    }
    if (inDiff) {
       if (l.startsWith('+')) {
         extracted.push(l.substring(1));
       } else if (l.startsWith(' ')) {
         extracted.push(l.substring(1));
       }
    }
  }
  fs.writeFileSync('d:/devite/extracted_endpoints.ts', extracted.join('\n'));
  console.log('Extracted ' + extracted.length + ' lines.');
} else {
  console.log('Diff block not found');
}
