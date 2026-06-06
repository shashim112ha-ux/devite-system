const fs = require('fs');
const lines = fs.readFileSync('C:/Users/shash/.gemini/antigravity/brain/19ad0c29-32c0-4cd5-a128-ae31ca848815/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');
let longest = '';
for (let line of lines) {
  if (!line) continue;
  try {
    const d = JSON.parse(line);
    if (d.content && d.content.includes('createProduct: ')) {
       if (d.content.length > longest.length) {
         longest = d.content;
       }
    }
  } catch(e){}
}
if (longest) {
  fs.writeFileSync('d:/devite/longest_router.txt', longest);
  console.log('Found string with length:', longest.length);
} else {
  console.log('Not found');
}
