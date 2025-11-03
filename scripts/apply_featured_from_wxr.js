#!/usr/bin/env node
// scripts/apply_featured_from_wxr.js
// 用法：node scripts/apply_featured_from_wxr.js import/export.xml _posts
const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

function maybeEncodeSlug(s) {
  if (!s) return '';
  return /%[0-9a-fA-F]{2}/.test(s) ? s : encodeURIComponent(s);
}
function permalinkOf(dateStr, postName) {
  const [y,m,d] = (dateStr||'').slice(0,10).split('-');
  return `/${y}/${m}/${d}/${maybeEncodeSlug(postName||'')}/`;
}
function assetPathFromAttachmentUrl(u) {
  try {
    const { pathname } = new URL(u);
    const i = pathname.indexOf('/uploads/');
    const suffix = i >= 0 ? pathname.slice(i) : pathname;
    return '/assets' + suffix; // => /assets/uploads/YYYY/MM/file.ext
  } catch { return ''; }
}

(async () => {
  const wxrPath = process.argv[2] || 'import/export.xml';
  const postsDir = process.argv[3] || '_posts';
  const DRY = process.env.DRY_RUN === '1';

  const xml = fs.readFileSync(wxrPath, 'utf8');
  const data = await parseStringPromise(xml, { explicitArray: true });
  const items = data?.rss?.channel?.[0]?.item || [];

  // 1) 先把所有 attachment 建 id->url 對照
  const attachById = {};
  for (const it of items) {
    if (it['wp:post_type']?.[0] === 'attachment') {
      const id  = String(it['wp:post_id']?.[0] || '');
      const url = String(it['wp:attachment_url']?.[0] || it['guid']?.[0]?._ || '');
      if (id && url) attachById[id] = url;
    }
  }

  // 2) 再建立「文章 permalink -> /assets/uploads/... 圖檔路徑」的 map
  const featuredByPermalink = {};
  for (const it of items) {
    if (it['wp:post_type']?.[0] !== 'post') continue;
    const date = String(it['wp:post_date']?.[0] || '');
    const name = String(it['wp:post_name']?.[0] || '');
    const permalink = permalinkOf(date, name);
    const metas = it['wp:postmeta'] || [];
    const metaThumb = metas.find(m => m['wp:meta_key']?.[0] === '_thumbnail_id');
    const thumbId = metaThumb?.['wp:meta_value']?.[0] && String(metaThumb['wp:meta_value'][0]);
    const attUrl = thumbId ? attachById[thumbId] : '';
    const imgPath = attUrl ? assetPathFromAttachmentUrl(attUrl) : '';
    if (permalink && imgPath) featuredByPermalink[permalink] = imgPath;
  }

  // 3) 走訪 _posts，依 permalink 對應並更新/新增 image:
  const files = fs.readdirSync(postsDir).filter(f => /\.(md|markdown|html)$/i.test(f));
  let changed = 0;
  for (const f of files) {
    const full = path.join(postsDir, f);
    const txt = fs.readFileSync(full, 'utf8');
    const fm = txt.match(/^---\n([\s\S]*?)\n---\s*/);
    if (!fm) { console.warn('No front matter:', f); continue; }
    const yaml = fm[1];
    const body = txt.slice(fm[0].length);

    const pm = yaml.match(/(^|\n)permalink:\s*["']?([^\n"']+)["']?/);
    const permalink = pm?.[2];
    if (!permalink) { console.warn('No permalink in', f); continue; }

    const newImg = featuredByPermalink[permalink];
    if (!newImg) continue; // 這篇在 XML 沒有縮圖或對不到

    let newYaml;
    if (/^image\s*:/m.test(yaml)) {
      if (new RegExp(`^image\\s*:\\s*["']?${newImg}["']?\\s*$`,'m').test(yaml)) continue;
      newYaml = yaml.replace(/^image\s*:.*$/m, `image: ${newImg}`);
    } else {
      newYaml = yaml + `\nimage: ${newImg}`;
    }

    const out = `---\n${newYaml}\n---\n${body}`;
    if (!DRY) fs.writeFileSync(full, out, 'utf8');
    changed++;
    console.log(`[image] ${f} -> ${newImg}`);
  }
  console.log(`Done. Updated ${changed} file(s).`);
})();
