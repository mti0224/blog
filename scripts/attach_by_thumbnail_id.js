// scripts/attach_by_thumbnail_id.js
// 把 featured image（_thumbnail_id）寫入每篇文章的 front-matter: image: /assets/uploads/....
// 兩種來源：1) WXR 附件表 2) 文章本文中的 <img class="...wp-image-<id>..." src="...">

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { parseStringPromise } = require('xml2js');

const UP_BASE = 'assets/uploads';

const walk = (d) =>
  fs.existsSync(d)
    ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(d, e.name);
        return e.isDirectory() ? walk(p) : [p];
      })
    : [];

function splitFM(s) {
  if (!s.startsWith('---')) return null;
  const end = s.indexOf('\n---', 3);
  if (end < 0) return null;
  const head = s.slice(4, end);   // 去掉開頭 '---\n'
  const body = s.slice(end + 4);  // 去掉結尾 '\n---'
  return { head, body };
}

function writeFM(s, obj) {
  const fm = splitFM(s);
  if (!fm) return s; // 沒有 front-matter 就不處理
  const headNew = yaml.dump(obj, { lineWidth: -1 });
  return `---\n${headNew}---${fm.body}`;
}

function getFMObject(s) {
  const fm = splitFM(s);
  if (!fm) return null;
  try {
    return yaml.load(fm.head) || {};
  } catch {
    return null;
  }
}

function normalizeUploadsURL(u) {
  if (!u) return null;
  // 去掉 query
  u = u.replace(/\?[^#]*$/, '');
  // 只要 /wp-content/uploads 之後的相對路徑
  const m = u.match(/\/wp-content\/uploads\/(.+)$/i);
  if (m) return '/' + path.posix.join(UP_BASE, m[1]);
  // 如果本來就已經是 /assets/uploads/ 開頭
  if (/^\/assets\/uploads\//i.test(u)) return u;
  return null;
}

async function buildAttachmentMap() {
  const map = new Map(); // id -> '/assets/uploads/YYYY/MM/filename.ext'
  const xmls = walk('import').filter((f) => f.endsWith('.xml'));
  if (!xmls.length) {
    console.log('[attach] No XML under import/.');
    return map;
  }

  let itemCount = 0, attCount = 0;

  for (const xf of xmls) {
    const xml = fs.readFileSync(xf, 'utf8');
    const data = await parseStringPromise(xml, { explicitArray: true, mergeAttrs: true });
    const items = (((data || {}).rss || [])[0]?.channel || [])[0]?.item || [];
    itemCount += items.length;

    for (const it of items) {
      const type = (it['wp:post_type'] || [])[0]; // 'post' | 'attachment' | ...
      const id   = String((it['wp:post_id'] || [])[0] || '').trim();

      // 判斷是否為附件：有 wp:attachment_url 或 post_type=attachment 都算
      const attachmentURL = ((it['wp:attachment_url'] || [])[0] || (it['guid'] || [])[0] || '').toString();
      const isAttachment  = !!attachmentURL || String(type).toLowerCase() === 'attachment';
      if (!isAttachment || !id) continue;

      // 先從 _wp_attached_file 取相對路徑（YYYY/MM/file.ext）
      let rel = null;
      for (const m of (it['wp:postmeta'] || [])) {
        const k = (m['wp:meta_key'] || [])[0];
        const v = (m['wp:meta_value'] || [])[0];
        if (k === '_wp_attached_file' && v) {
          rel = String(v);
        }
      }
      // 退而求其次，從 URL 擷取
      if (!rel && attachmentURL.includes('/uploads/')) {
        rel = attachmentURL.split('/uploads/')[1];
      }
      if (rel) {
        const url = '/' + path.posix.join(UP_BASE, rel).replace(/%2F/gi, '/').replace(/\?[^#]*$/, '');
        map.set(id, url);
        attCount++;
      }
    }
  }

  console.log(`[attach] xml items=${itemCount}  attachments mapped=${attCount}`);
  return map;
}

function fallbackFromBody(html, thumbId) {
  // 直接找 <img ... class="...wp-image-<id>..." ... src="...">
  // 盡量匹配各種屬性順序
  const re = new RegExp(
    `<img[^>]*class="[^"]*wp-image-${thumbId}[^"]*"[^>]*src="([^"]+)"[^>]*>`,
    'i'
  );
  const m = html.match(re);
  if (m && m[1]) {
    const norm = normalizeUploadsURL(m[1]);
    if (norm) return norm;
  }
  // 也試試看沒有 class 限定，但有 "wp-image-<id>" 在別處
  const reAnyImg = /<img[^>]*src="([^"]+)"[^>]*>/gi;
  let mm;
  while ((mm = reAnyImg.exec(html))) {
    if (html.slice(Math.max(0, mm.index - 200), mm.index + mm[0].length + 200).includes(`wp-image-${thumbId}`)) {
      const norm = normalizeUploadsURL(mm[1]);
      if (norm) return norm;
    }
  }
  return null;
}

(async () => {
  const attachMap = await buildAttachmentMap();

  const posts = walk('_posts')
    .filter((f) => /\.(md|markdown|html)$/i.test(f));

  let updated = 0, withThumb = 0, missing = 0, fromWXR = 0, fromBody = 0;

  for (const file of posts) {
    const raw = fs.readFileSync(file, 'utf8');
    const fm = splitFM(raw);
    if (!fm) { missing++; continue; }

    const front = getFMObject(raw) || {};
    const meta  = front.meta || {};
    const tid   = String(meta._thumbnail_id || meta['_thumbnail_id'] || '').trim();

    if (!tid) { missing++; continue; }

    let imagePath = attachMap.get(tid);
    if (!imagePath) {
      // 備援：從本文抓 <img class="...wp-image-<tid>..." src="...">
      imagePath = fallbackFromBody(fm.body, tid);
      if (imagePath) fromBody++; else missing++;
    } else {
      fromWXR++;
    }

    if (imagePath && front.image !== imagePath) {
      front.image = imagePath;
      const out = writeFM(raw, front);
      fs.writeFileSync(file, out);
      updated++;
    }
    withThumb++;
  }

  console.log(`[attach] posts=${posts.length}  withThumb=${withThumb}  updated=${updated}  viaWXR=${fromWXR}  viaBody=${fromBody}  missing=${missing}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
