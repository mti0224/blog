---
layout: home
title: warmycat.com
---

<style>
  .post-list { list-style: none; padding-left: 0; margin: 0; }
  .post-card { display: grid; grid-template-columns: 160px 1fr; gap: 16px; padding: 14px 0; border-bottom: 1px solid rgba(0,0,0,.08); }
  .post-card a { text-decoration: none; }
  .thumb { width: 160px; height: 90px; object-fit: cover; border-radius: 10px; display: block; }
  .meta { font-size: 12px; opacity: .7; margin: 0 0 6px; }
  .title { margin: 0 0 8px; font-size: 18px; line-height: 1.25; }
  .excerpt { margin: 0; opacity: .85; }
  @media (max-width: 640px) {
    .post-card { grid-template-columns: 1fr; }
    .thumb { width: 100%; height: 180px; }
  }
</style>

<ul class="post-list">
  {% for post in site.posts %}
    <li class="post-card">
      <a href="{{ post.url | relative_url }}" aria-label="{{ post.title }}">
        {% if post.coverImage %}
          <img class="thumb" src="{{ post.coverImage | relative_url }}" alt="{{ post.title }}">
        {% endif %}
      </a>

      <div>
        <p class="meta">{{ post.date | date: "%Y-%m-%d" }}</p>
        <h2 class="title">
          <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        </h2>
        <p class="excerpt">
          {{ post.excerpt | strip_html | strip_newlines | truncate: 120 }}
        </p>
      </div>
    </li>
  {% endfor %}
</ul>
