// scripts/attach_by_thumbnail_id.js
// node scripts/attach_by_thumbnail_id.js
const fs = require('fs'), path = require('path');

function findXmls() {
  const dirs = ['import', '.', 'wxr'];
  const out = [];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (f.toLowerCase().endsWith('.xml')) out.push(path.join(d, f));
    }
  }
  return out;
}
function parseAttachments(xml) {
  const items = [];
  const reItem = /<item>[\s\S]*?<\/item>/g;
  const reType = /<wp:post_type><!\[CDATA\[(.*?)\]\]><\/wp:post_type>/;
  const reId   = /<wp:post_id>(\d+)<\/wp:post_id>/;
  const reURL  = /<wp:attachment_url><!\[CDATA\[(.*?)\]\]><\/wp:attachment_url>/;
  for (const m of xml.matchAll(reItem)) {
    const blk = m[0];
    const type = (blk.match(reType)||[])[1];
    if (type !== 'attachment') continue;
    const id  = (blk.match(reId)||[])[1];
    const url = (blk.match(reURL)||[])[1];
    if (id && url) items.push({ id: String(id), url });
  }
  return items;
}
function toAssets(u) {
  const m = u && u.match(/\/wp-content\/uploads\/(\d{4}\/\d{2}\/[^?]+)$/);
  return m ? `/assets/uploads/${m[1]}` : null;
}

const xmlPaths = process.env.XML_PATH ? [process.env.XML_PATH] : findXmls();
let map = new Map();
for (const p of xmlPaths) {
  try {
    const xml = fs.readFileSync(p, 'utf8');
    for (const it of parseAttachments(xml)) {
      const local = toAssets(it.url);
      if (local) map.set(it.id, local);
    }
  } catch {}
}
console.log(`[attach] xml files=${xmlPaths.length}  attachments mapped=${map.size}`);

const postsDir = '_posts';
let updated=0, withThumb=0, viaWXR=0, viaBody=0;

for (const name of fs.readdirSync(postsDir)) {
  if (!/\.(md|markdown|html)$/i.test(name)) continue;
  const p = path.join(postsDir, name);
  let s = fs.readFileSync(p, 'utf8');

  const fmStart = s.indexOf('---');
  const fmEnd = s.indexOf('---', fmStart+3);
  if (fmStart !== 0 || fmEnd === -1) continue;

  const head = s.slice(0, fmEnd+3);
  const body = s.slice(fmEnd+3);

  const mId = head.match(/_thumbnail_id:\s*['"]?(\d+)['"]?/);
  if (!mId) continue;
  withThumb++;
  if (/^\s*image:/m.test(head)) continue; // 已有 image

  let url = map.get(mId[1]);
  if (!url) {
    // 退而求其次：從本文中的 wp-image-XXXX 去反查附件
    const ids = [...body.matchAll(/wp-image-(\d{3,})/g)].map(x=>x[1]);
    for (const id of ids) { if (map.get(id)) { url = map.get(id); viaBody++; break; } }
  }
  if (!url) continue;

  const newHead = head.replace(/\n$/, '') + `\nimage: ${url}\n`;
  fs.writeFileSync(p, newHead + body);
  updated++; if (map.get(mId[1])) viaWXR++;
}
console.log(`[attach] posts=${withThumb}  updated=${updated}  viaWXR=${viaWXR}  viaBody=${viaBody}  missing=${withThumb - updated}`);
