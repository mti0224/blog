// scripts/attach_by_thumbnail_id.js
// 將 WordPress 的 featured image（_thumbnail_id）寫入每篇 post 的 front-matter: image: /assets/uploads/...
// 來源優先順序：WXR 附件表 -> 本文 <img class="...wp-image-<id>..." src="..."> 備援
// 同時處理 BOM、各種 YAML/Front-Matter 邊界情況。

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { parseStringPromise } = require('xml2js');

const POSTS_DIR = '_posts';
const IMPORT_DIR = 'import';
const UP_BASE = 'assets/uploads';

// --- utilities ---
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

function stripBOM(s) {
  return s.replace(/^\uFEFF/, '');
}

function extractFrontMatter(raw) {
  const s = stripBOM(raw);
  // 以換行分段找兩條 '---' 獨立行
  const lines = s.split(/\r?\n/);
  if (lines[0].trim() !== '---') return null;
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { end = i; break; }
  }
  if (end < 0) return null;
  const head = lines.slice(1, end).join('\n');
  const body = lines.slice(end + 1).join('\n');
  return { head, body, before: s.slice(0, s.indexOf(head)), after: s.slice(s.indexOf(body)) };
}

function parseFMObject(head) {
  try { return yaml.load(head) || {}; } catch { return null; }
}

function writeFM(raw, obj) {
  const fm = extractFrontMatter(raw);
  if (!fm) return raw; // 不動
  const headNew = yaml.dump(obj, { lineWidth: -1 });
  return `---\n${headNew}---\n${fm.body}`;
}

function findThumbIdFromFMObj(frontObj, headRaw) {
  if (!frontObj) frontObj = {};
  // 常見兩種：meta._thumbnail_id 或 _thumbnail_id 直屬
  const meta = frontObj.meta || {};
  let id = meta._thumbnail_id || meta['_thumbnail_id'] || frontObj._thumbnail_id || frontObj['_thumbnail_id'];
  if (id) return String(id).trim();
  // YAML 解析失敗時，以正則在 head 兜底
  const m = String(headRaw).match(/_thumbnail_id:\s*['"]?(\d+)['"]?/);
  return m ? m[1] : '';
}

function normalizeUploadsURL(u) {
  if (!u) return null;
  u = u.replace(/\?[^#]*$/, '');                // 去 query
  const m = u.match(/\/wp-content\/uploads\/(.+)$/i);
  if (m) return '/' + path.posix.join(UP_BASE, m[1]);
  if (/^\/assets\/uploads\//i.test(u)) return u; // 已是相對資源
  return null;
}

async function build
