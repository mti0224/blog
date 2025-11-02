// scripts/attach_by_thumbnail_id.js
// 目的：把 WordPress 的 featured image 寫入每篇文章 front-matter: image: /assets/uploads/...
// 來源優先：WXR 附件表 -> 本文中 class="wp-image-<id>" 的 <img> 備援
// 新增：可辨識 {{site.baseurl}} / {{ site.baseurl }} / | relative_url 前綴，以及任何包含 assets/uploads 的 src

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { parseStringPromise } = require('xml2js');

const POSTS_DIR = '_posts';
const IMPORT_DIR = 'import';
const UP_BASE = 'assets/uploads';

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
const stripBOM = (s) => s.replace(/^\uFEFF/, '');

function extractFrontMatter(raw) {
  const s = stripBOM(raw);
  const lines = s.split(/\r?\n/);
  if (lines[0].trim() !== '---') return null;
  let end = -1;
  for (let i = 1; i < lines.length; i++) if (lines[i].trim() === '---') { end = i; break; }
  if (end < 0) return null;
  const head = lines.slice(1, end).join('\n');
  const body = lines.slice(end + 1).join('\n');
  return { head, body };
}
function parseFMObject(head) {
  try { return yaml.load(head) || {}; } catch { return null; }
}
function writeFM(raw, obj) {
  const fm = extractFrontMatter(raw);
  if (!fm) return raw;
  const headNew = yaml.dump(obj, { lineWidth: -1 });
  return `---\n${headNew}---\n${fm.body}`;
}
function findThumbIdFromFMObj(frontObj, headRaw) {
  if (!frontObj) frontObj = {};
  const meta = frontObj.meta || {};
  let id = meta._thumbnail_id || meta['_thumbnail_id'] || frontObj._thumbnail_id || frontObj['_thumbnail_id'];
  if (id) return String(id).trim();
  const m = String(headRaw).match(/_thumbnail_id:\s*['"]?(\d+)['"]?/);
  return m ? m[1] : '';
}

// ★ 修正：支援 Liquid 前綴與任何位置的 assets/uploads
function normalizeUploadsURL(u) {
  if (!u) return null;
  u = String(u).trim();

  // 去 query
  u = u.replace(/\?[^#"]*$/, '');

  // 移除 Liquid 前綴（各種寫法）
  u = u
    .replace(/\{\{\s*site\.baseurl\s*\}\}\s*\|\s*relative_url/gi, '')
    .replace(/\{\{\s*site\.baseurl\s*\}\}/gi, '')
    .replace(/\{\{\s*site\.baseurl\s*\|\s*relative_url\s*\}\}/gi, '');

  // wp-content/uploads -> assets/uploads
  const mWP = u.match(/\/wp-content\/uploads\/([^"')\s>]+)/i);
  if (mWP) {
    const rel = mWP[1];
    return '/' + path.posix.join(UP_BASE, rel);
  }

  // 任何字串中出現 assets/uploads/xxx
  const mAssets = u.match(/\/?assets\/uploads\/([^"')\s>]+)/i);
  if (mAssets) {
    const rel = mAssets[1];
    return '/' + path.posix.join('assets/uploads', rel);
  }

  return null;
}

async function buildAttachmentMap() {
  const map = new Map();
  const xmls = walk(IMPORT_DIR).filter(f => f.endsWith('.xml'));
  if (!xmls.length) { console.log('[attach] no XML under import/'); return map; }

  let items = 0, mapped = 0;
  for (const xf of xmls) {
    const xml = fs.readFileSync(xf, 'utf8');
    const data = await parseStringPromise(xml, { explicitArray: true, mergeAttrs: true });
    const arr = (((data || {}).rss || [])[0]?.channel || [])[0]?.item || [];
    items += arr.length;

    for (const it of arr) {
      const type = (it['wp:post_type'] || [])[0];
      const id = String((it['wp:post_id'] || [])[0] || '').trim();
      const attachmentURL = ((it['wp:attachment_url'] || [])[0] || (it['guid'] || [])[0] || '').toString();
      const isAttachment = !!attachmentURL || String(type).toLowerCase() === 'attachment';
      if (!isAttachment || !id) continue;

      let rel = null;
      for (const m of (it['wp:postmeta'] || [])) {
        const k = (m['wp:meta_key'] || [])[0];
        const v = (m['wp:meta_value'] || [])[0];
        if (k === '_wp_attached_file' && v) rel = String(v);
      }
      if (!rel && attachmentURL.includes('/uploads/')) {
        rel = attachmentURL.split('/uploads/')[1];
      }
      if (rel) {
        const url = '/' + path.posix.join(UP_BASE, rel).replace(/%2F/gi, '/').replace(/\?[^#]*$/, '');
        map.set(id, url);
        mapped++;
      }
    }
  }
  console.log(`[attach] xml items=${items}  attachments mapped=${mapped}`);
  return map;
}

function fallbackImageFromBody(body, thumbId) {
  // 先用 class 精準選
  const re = new RegExp(`<img[^>]*class="[^"]*wp-image-${thumbId}[^"]*"[^>]*src="([^"]+)"[^>]*>`, 'i');
  let m = body.match(re);
  if (m && m[1]) {
    const norm = normalizeUploadsURL(m[1]);
    if (norm) return norm;
  }

  // 再掃所有 <img>，並檢查附近是否含有 wp-image-<id>
  const reAny = /<img[^>]*src="([^"]+)"[^>]*>/gi;
  let mm;
  while ((mm = reAny.exec(body))) {
    const slice = body.slice(Math.max(0, mm.index - 200), Math.min(body.length, mm.index + mm[0].length + 200));
    if (slice.includes(`wp-image-${thumbId}`)) {
      const norm = normalizeUploadsURL(mm[1]);
      if (norm) return norm;
    }
  }
  return null;
}

(async () => {
  const posts = walk(POSTS_DIR).filter(f => /\.(md|markdown|html)$/i.test(f));
  const attachMap = await buildAttachmentMap();

  let withThumb = 0, updated = 0, missing = 0, viaWXR = 0, viaBody = 0;

  for (const file of posts) {
    const raw = fs.readFileSync(file, 'utf8');
    const fm = extractFrontMatter(raw);
    if (!fm) { missing++; continue; }

    const front = parseFMObject(fm.head) || {};
    const tid = findThumbIdFromFMObj(front, fm.head);
    if (!tid) { missing++; continue; }

    let imgPath = attachMap.get(tid);
    if (!imgPath) {
      imgPath = fallbackImageFromBody(fm.body, tid);
      if (imgPath) viaBody++; else missing++;
    } else {
      viaWXR++;
    }

    if (imgPath && front.image !== imgPath) {
      front.image = imgPath;
      const out = writeFM(raw, front);
      fs.writeFileSync(file, out);
      updated++;
    }
    withThumb++;
  }

  console.log(`[attach] posts=${posts.length}  withThumb=${withThumb}  updated=${updated}  viaWXR=${viaWXR}  viaBody=${viaBody}  missing=${missing}`);
})().catch((e) => { console.error(e); process.exit(1); });
