const fs = require('fs');
const lines = fs.readFileSync('C:/Users/shash/.gemini/antigravity/brain/19ad0c29-32c0-4cd5-a128-ae31ca848815/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');
for (let line of lines) {
  if (!line) continue;
  try {
    const d = JSON.parse(line);
    if (d.type === 'ACTION' && d.content && d.content.includes('view_file') && d.content.includes('router.ts')) {
       console.log('Found view_file for router.ts in step', d.step_index);
    }
    if (d.type === 'ACTION_RESPONSE' && d.content && d.content.includes('export const appRouter')) {
       console.log('Found full router.ts response in step', d.step_index);
       fs.writeFileSync('d:/devite/router-from-transcript.ts', d.content);
       console.log('Wrote to router-from-transcript.ts');
    }
  } catch(e){}
}
