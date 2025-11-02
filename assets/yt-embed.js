(function () {
  var root = document.getElementById('post-content');
  if (!root) return;

  // 把形如 https://www.youtube.com/watch?v=XXXX 或 youtu.be/XXXX 的連結轉為 iframe
  var YT = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_\-]{6,})/;

  Array.from(root.querySelectorAll('p, a')).forEach(function (node) {
    var txt = (node.tagName === 'A' ? node.href : node.textContent || '').trim();
    var m = txt.match(YT);
    if (!m) return;

    var id = m[1];
    var iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '360';
    iframe.src = 'https://www.youtube.com/embed/' + id;
    iframe.title = 'YouTube video player';
    iframe.frameBorder = '0';
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;

    // 以 iframe 取代原本那段文字或連結
    if (node.tagName === 'A') {
      var p = document.createElement('p');
      p.appendChild(iframe);
      node.replaceWith(p);
    } else {
      node.innerHTML = '';
      node.appendChild(iframe);
    }
  });
})();
