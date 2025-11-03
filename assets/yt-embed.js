// assets/yt-embed.js
(function () {
  const YT_ID = /(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([\w-]{11})/i;

  function makeIframe(id) {
    const wrap = document.createElement('div');
    wrap.className = 'yt-16x9';
    wrap.innerHTML =
      `<iframe src="https://www.youtube.com/embed/${id}" title="YouTube video"
        frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    return wrap;
  }

  function onlyText(node) {
    // 該節點只含純文字（不含其他元素）
    return Array.from(node.childNodes).every(n => n.nodeType === Node.TEXT_NODE);
  }

  function tryReplace(node, text) {
    const m = (text || '').trim().match(YT_ID);
    if (!m) return false;
    const id = m[1];
    // 避免重複嵌入
    if (node.querySelector && node.querySelector('iframe')) return false;
    // 只在「純 URL」或 WP 的 wrapper 上替換
    if (onlyText(node) || node.classList?.contains('wp-block-embed__wrapper')) {
      node.innerHTML = '';
      node.appendChild(makeIframe(id));
      return true;
    }
    return false;
  }

  function run() {
    // 1) 先處理 WP 匯出的 <figure>…<div class="wp-block-embed__wrapper">URL</div>
    document.querySelectorAll('.wp-block-embed__wrapper').forEach(div => {
      tryReplace(div, div.textContent);
    });

    // 2) 再處理頁面上「單獨一行的 YouTube URL」
    document.querySelectorAll('p, div, figure').forEach(el => {
      if (el.querySelector && el.querySelector('iframe')) return;
      const txt = el.textContent || '';
      if (txt.includes('youtube.com/watch') || txt.includes('youtu.be/')) {
        tryReplace(el, txt);
      }
    });

    // 3) 兼容 <a href="..."> 形式
    document.querySelectorAll('a[href*="youtube.com/watch"], a[href*="youtu.be/"]').forEach(a => {
      const m = a.href.match(YT_ID);
      if (!m) return;
      const host = a.closest('p, div, figure') || a.parentElement;
      if (!host) return;
      if (host.querySelector('iframe')) return;
      // 如果父層只有這個連結，就用 iframe 取代父層；否則只取代連結本身
      if (onlyText(host)) {
        host.innerHTML = '';
        host.appendChild(makeIframe(m[1]));
      } else {
        a.replaceWith(makeIframe(m[1]));
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
