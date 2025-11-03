(function () {
  const sel = '.content';
  const root = document.querySelector(sel);
  if (!root) return;

  // 1) 將純文字的 youtube 連結轉成 iframe
  const ytRe = /(https?:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_\-]{6,}))/i;
  root.querySelectorAll('p, div').forEach(node => {
    const t = node.textContent && node.textContent.trim();
    if (t && ytRe.test(t)) {
      const id = t.match(ytRe)[2];
      const wrap = document.createElement('div');
      wrap.innerHTML =
        `<div class="yt16x9"><iframe src="https://www.youtube.com/embed/${id}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
      node.replaceWith(wrap);
    }
  });

  // 2) 把 WP 匯出的 <figure class="wp-block-embed ..."> 只留第一個 iframe
  root.querySelectorAll('figure.wp-block-embed').forEach(fig => {
    const iframes = fig.querySelectorAll('iframe');
    if (!iframes.length) { fig.remove(); return; }
    const first = iframes[0];
    const box = document.createElement('div');
    box.className = 'yt16x9';
    first.parentNode.replaceWith(box);
    box.appendChild(first);
    fig.replaceWith(box);
  });

  // 基本 16:9 外框樣式
  const css = document.createElement('style');
  css.textContent = `.yt16x9{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;background:#000;margin:12px 0}
  .yt16x9 iframe{position:absolute;left:0;top:0;width:100%;height:100%}`;
  document.head.appendChild(css);
})();
