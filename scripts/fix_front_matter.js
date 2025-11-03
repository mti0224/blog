// scripts/fix_front_matter.js
const fs = require('fs');
const path = require('path');

const POSTS_DIR = '_posts';

function fixOne(filePath) {
  let txt = fs.readFileSync(filePath, 'utf8');
  // 僅處理有 front-matter 的貼文
  if (!txt.startsWith('---')) return { changed: false, reason: 'no-front-matter-start' };

  const lines = txt.split('\n');

  // 尋找 front-matter 結束線；若「黏在同一行」就把它拆開
  let end = -1;
  for (let i = 1; i < Math.min(lines.length, 400); i++) {
    if (lines[i].trim() === '---') { end = i; break; }

    const idx = lines[i].indexOf('---');
    if (idx !== -1) {
      const pre = lines[i].slice(0, idx).replace(/\s+$/, '');
      const post = lines[i].slice(idx + 3).replace(/^\s+/, '');
      lines[i] = pre;
      lines.splice(i + 1, 0, '---');
      if (post) lines.splice(i + 2, 0, post);
      end = i + 1;
      break;
    }
  }

  if (end === -1) return { changed: false, reason: 'no-front-matter-end' };

  // 結束線後面確保有一個空行，讓內容與 YAML 分開
  if (typeof lines[end + 1] !== 'undefined' && lines[end + 1] !== '') {
    lines.splice(end + 1, 0, '');
  }

  const out = lines.join('\n');
  if (out !== txt) {
    fs.writeFileSync(filePath, out, 'utf8');
    return { changed: true };
  }
  return { changed: false };
}

function walk(dir) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  let changedCount = 0;
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      changedCount += walk(p);
    } else if (e.isFile() && (p.endsWith('.md') || p.endsWith('.html'))) {
      const res = fixOne(p);
      if (res.changed) { console.log('[fixed]', p); changedCount++; }
      else if (res.reason) { console.log('[skip]', p, res.reason); }
    }
  }
  return changedCount;
}

try {
  const n = walk(POSTS_DIR);
  console.log(`Done. Changed files: ${n}`);
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
