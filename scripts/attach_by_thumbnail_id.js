// scripts/attach_by_thumbnail_id.js
const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap(e => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? walk(p) : [p];
    });
}

function stripQuery(u) { return u.replace(/\?[^#)"]*$/, ''); }

async function loadWxrMap(xmlPath) {
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const doc = await parseStringPromise(xml, { explicitArray: true });
  const items = (((doc || {}).rss || [])[0] || {}).channel?.[0]?.item || [];
  const map = {}; // id -> /assets/uploads/yyyy/mm/file.ext
  for (const it of items) {
    const type = (it['wp:post_type'] || [''])[0];
    if (type !== 'attachment') continue;
    const id = String((it['wp:post_id'] || [''])[0] || '').trim();
    const url = String((it['wp:attachment_url'] || [''])[0] || '').trim();
    if (!id || !url) continue;
    const noQ = stripQuery(url);
    const idx = noQ.indexOf('/wp-content/uploads/');
    if (idx === -1) continue;
    const tail = noQ.substring(idx + '/wp-content/uploads/'.length);
    map[id] = '/assets/uploads/' + tail;
  }
  return map;
}

function insertImageIntoFrontMatter(src, imagePath) {
  // 解析 Front-Matter
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  let yaml = '', body = src;
  if (m) { yaml = m[1]; body = src.slice(m[0].length); }

  // 把誤放在本文最上方的 `image: ...` 單行清掉
  body = body.replace(/^\s*image:\s*\S+.*\n/i, '');

  // 若原本就有 image:，直接覆寫；否則追加一行
  if (yaml) {
    if (/^image:/m.test(yaml)) {
      yaml = yaml.replace(/^image:\s*.*$/m, `image: ${imagePath}`);
    } else {
      yaml = yaml + (yaml.endsWith('\n') ? '' : '\n') + `image: ${imagePath}\n`;
    }
    return `---\n${yaml}---\n${body}`;
  } else {
    return `---\nimage: ${imagePath}\n---\n${body}`;
  }
}

function pickThumbIdFromYaml(yaml) {
  const a = yaml.match(/_thumbnail_id:\s*'(\d+)'/);
  if (a) return a[1];
  const b = yaml.match(/_thumbnail_id:\s*(\d+)/);
  if (b) return b[1];
  return null;
}

function firstLocalAssetInBody(body) {
  const m = body.match(/assets\/uploads\/[^\s"'>)]+/);
  return m ? '/' + m[0].replace(/^\/+/, '') : null;
}

function patchPost(file, id2asset) {
  const s = fs.readFileSync(file, 'utf8');
  const fm = s.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const yaml = fm ? fm[1] : '';
  const body = fm ? s.slice(fm[0].length) : s;

  let img = null;
  const tid = pickThumbIdFromYaml(yaml);
  if (tid && id2asset[tid]) img = id2asset[tid];

  if (!img) {
    // 後備：從本文找第一個 assets/uploads 圖片
    img = firstLocalAssetInBody(body);
  }

  if (!img) return false; // 找不到就不改

  const out = insertImageIntoFrontMatter(s, img);
  if (out !== s) fs.writeFileSync(file, out);
  return out !== s;
}

(async () => {
  // 找 WXR
  let xml = null;
  if (fs.existsSync('import/export.xml')) xml = 'import/export.xml';
  else {
    const c = walk('import').filter(f => /\.xml$/i.test(f));
    if (c.length) xml = c[0];
  }

  let id2asset = {};
  if (xml) {
    id2asset = await loadWxrMap(xml);
  }

  const posts = walk('_posts').filter(f => /\.(md|markdown|html)$/i.test(f));
  let updated = 0, withThumb = 0;
  for (const f of posts) {
    const s = fs.readFileSync(f, 'utf8');
    const fm = s.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    const yaml = fm ? fm[1] : '';
    if (/_thumbnail_id:/m.test(yaml)) withThumb++;
    if (patchPost(f, id2asset)) updated++;
  }
  console.log(`[attach] xml=${!!xml} attachments=${Object.keys(id2asset).length} posts=${posts.length} withThumb=${withThumb} updated=${updated}`);
})();
