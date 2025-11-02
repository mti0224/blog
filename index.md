---
layout: default
title: 首頁
---

<style>
  .grid { display:grid; gap:1rem; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
  .card { border:1px solid #e5e5e5; border-radius:12px; overflow:hidden; background:#fff; }
  .thumb { display:block; background:#f3f3f3; }
  .thumb img { width:100%; height:180px; object-fit:cover; display:block; }
  .body { padding:12px 14px; }
  .title { margin:0 0 6px; font-size:1rem; line-height:1.35; }
  .meta { color:#666; font-size:.85rem; margin-bottom:6px; }
  .excerpt { color:#333; font-size:.9rem; }
  @media (prefers-color-scheme: dark) {
    .card { border-color:#333; background:#121212; }
    .thumb { background:#1f1f1f; }
    .title a { color:#fff; }
    .meta { color:#aaa; }
    .excerpt { color:#ddd; }
  }
</style>

{% assign posts_list = site.posts %}

<div class="grid">
  {% for post in posts_list %}
    <article class="card">
      <a class="thumb" href="{{ post.url | relative_url }}">
        {% if post.image %}
          <img src="{{ post.image | relative_url }}" alt="{{ post.title | escape }}">
        {% else %}
          <!-- 沒有 image 就不放縮圖（或放佔位 div 也行） -->
        {% endif %}
      </a>
      <div class="body">
        <h3 class="title"><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></h3>
        <div class="meta">{{ post.date | date: "%Y-%m-%d" }}</div>
        <div class="excerpt">{{ post.excerpt | strip_html | truncate: 100 }}</div>
      </div>
    </article>
  {% endfor %}
</div>
