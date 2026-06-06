const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function readGitObject(hash) {
  const p = path.join('.git', 'objects', hash.substring(0, 2), hash.substring(2));
  if (!fs.existsSync(p)) return null;
  const buffer = fs.readFileSync(p);
  const inflated = zlib.inflateSync(buffer);
  const nullIdx = inflated.indexOf(0);
  const header = inflated.slice(0, nullIdx).toString('utf8');
  const type = header.split(' ')[0];
  const content = inflated.slice(nullIdx + 1);
  return { type, content };
}

function parseTree(buffer) {
  const entries = [];
  let i = 0;
  while (i < buffer.length) {
    const spaceIdx = buffer.indexOf(32, i);
    const mode = buffer.slice(i, spaceIdx).toString('utf8');
    const nullIdx = buffer.indexOf(0, spaceIdx);
    const name = buffer.slice(spaceIdx + 1, nullIdx).toString('utf8');
    const hash = buffer.slice(nullIdx + 1, nullIdx + 21).toString('hex');
    entries.push({ mode, name, hash });
    i = nullIdx + 21;
  }
  return entries;
}

const headRef = fs.readFileSync('.git/HEAD', 'utf8').trim().split(': ')[1];
const commitHash = fs.readFileSync('.git/' + headRef, 'utf8').trim();
console.log('Commit hash:', commitHash);

const commitObj = readGitObject(commitHash);
const treeHash = commitObj.content.toString('utf8').split('\n')[0].split(' ')[1];
console.log('Tree hash:', treeHash);

function findBlob(treeHash, targetPath) {
  const parts = targetPath.split('/');
  let currentTreeHash = treeHash;
  for (let i = 0; i < parts.length; i++) {
    const obj = readGitObject(currentTreeHash);
    if (!obj || obj.type !== 'tree') return null;
    const entries = parseTree(obj.content);
    const entry = entries.find(e => e.name === parts[i]);
    if (!entry) return null;
    if (i === parts.length - 1) return entry.hash;
    currentTreeHash = entry.hash;
  }
  return null;
}

const blobHash = findBlob(treeHash, 'apps/server/src/router.ts');
if (blobHash) {
  console.log('Blob hash:', blobHash);
  const blobObj = readGitObject(blobHash);
  fs.writeFileSync('d:/devite/apps/server/src/router_recovered.ts', blobObj.content);
  console.log('Recovered router.ts!');
} else {
  console.log('Could not find blob');
}
