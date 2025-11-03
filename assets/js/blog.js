(function () {
  // 1) 把開頭那種純文字 'image: /assets/...' 移掉
  const pc = document.getElementById('post-content');
  if (pc) {
    const first = pc.firstElementChild;
    if (first && first.textContent) {
      const t = first.textContent.trim();
      if (t.startsWith('image: ')) first.remove();
    }
  }

  // 2) 將純 YouTube 連結轉成 iframe
  const YT = /https?:\/\/(www\.)?youtube\.com\/watch\?v=([^&\s]+)/i;
  const YTS = /https?:\/\/youtu\.be\/([^?\s]+)/i;

  function toIframe(url) {
    let id = null;
    let m = url.match(YT);
    if (m) id = m[2];
    if (!id) {
      m = url.match(YTS);
      if (m) id = m[1];
    }
    if (!id) return null;

    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '360';
    iframe.src = `https://www.youtube.com/embed/${id}`;
    iframe.title = 'YouTube video player';
    iframe.frameBorder = '0';
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.style.borderRadius = '12px';
    iframe.style.margin = '10px 0';
    return iframe;
  }

  if (pc) {
    // 把只有一條連結的 <p> 轉成 iframe
    [...pc.querySelectorAll('p')].forEach(p => {
      const text = p.textContent.trim();
      const m = text.match(YT) || text.match(YTS);
      if (m && p.children.length === 0) {
        const iframe = toIframe(text);
        if (iframe) p.replaceWith(iframe);
      }
    });
  }
})();
