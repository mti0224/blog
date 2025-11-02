// 修正：把 body 頭一行的 `image: /assets/...` 搬回 front-matter
const fs = require('fs');
const path = require('path');

function splitFM(s) {
  if (!s.startsWith('---')) return null;
  const end = s.indexOf('\n---', 3);
  if (end === -1) return null;
  const fm = s.slice(3, end).trim();
  const body = s.slice(end + 4);
  return { fm, body, start: 0, end: end + 4 };
}

function ensureImageInFM(full) {
  const fmObj = splitFM(full);
  if (!fmObj) return { changed: false, out: full };

  let { fm, body } = fmObj;
  const lines = body.split(/\r?\n/);

  // 找內文第一個非空行是否為 image: /assets/xxx
  let firstIdx = lines.findIndex(l => l.trim() !== '');
  if (firstIdx === -1) firstIdx = 0;
  const m = lines[firstIdx] && lines[firstIdx].match(/^image:\s*(\/assets\/[^\s]+)$/);

  // front-matter 是否已有 image
  const hasImage = /^image:\s*/m.test(fm);

  let changed = false;
  if (m && !hasImage) {
    // 搬到 front-matter
    fm = `${fm}\nimage: ${m[1]}`;
    lines.splice(firstIdx, 1);
    body = lines.join('\n');
    changed = true;
  } else if (m && hasImage) {
    // 內文有多餘 image 行，刪掉
    lines.splice(firstIdx, 1);
    body = lines.join('\n');
    changed = true;
  }

  return changed ? { changed, out: `---\n${fm}\n---${body}` } : { changed: false, out: full };
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap(e => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? walk(p) : [p];
    });
}

(function main() {
  const posts = walk('_posts').filter(f => /\.(md|markdown|html)$/i.test(f));
  let changed = 0;
  for (const f of posts) {
    const s = fs.readFileSync(f, 'utf8');
    const { changed: c, out } = ensureImageInFM(s);
    if (c) {
      fs.writeFileSync(f, out);
      changed++;
    }
  }
  console.log('[normalize] changed files:', changed);
})();
