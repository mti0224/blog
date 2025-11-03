(function () {
  // 把正文中「image: /assets/...」這種單獨一行移除（你尚未搬回 Front-Matter 時避免出現）
  document.querySelectorAll('.post-content p, .post-content div').forEach(p => {
    const t = (p.textContent || '').trim();
    if (/^image:\s*\/assets\/uploads\//i.test(t) && p.childElementCount === 0) {
      p.remove();
    }
  });

  function extractId(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) return u.pathname.split('/')[1];
      if (u.hostname.includes('youtube.com')) {
        if (u.searchParams.get('v')) return u.searchParams.get('v');
        const m = u.pathname.match(/\/shorts\/([^/]+)/);
        if (m) return m[1];
      }
    } catch (e) {}
    return null;
  }

  function isPureUrlEl(el) {
    return el && el.childElementCount === 0 &&
      /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i.test(el.textContent.trim());
  }

  function replaceEl(el, id) {
    el.innerHTML =
      '<div class="yt-embed">' +
      '<iframe src="https://www.youtube.com/embed/' + id + '" ' +
      'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
      'allowfullscreen loading="lazy"></iframe></div>';
  }

  // 1) 純文字網址（<p>/<div>/<li>）
  document.querySelectorAll('p,div,li,.wp-block-embed__wrapper').forEach(el => {
    if (isPureUrlEl(el)) {
      const id = extractId(el.textContent.trim());
      if (id) replaceEl(el, id);
    }
  });

  // 2) 只有一個 <a href="https://youtu..."> 的段落
  document.querySelectorAll('a[href*="youtu"]').forEach(a => {
    const id = extractId(a.href);
    if (!id) return;
    const p = a.parentElement;
    if (p && p.childElementCount === 1) replaceEl(p, id);
  });
})();
