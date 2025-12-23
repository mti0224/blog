---
layout: home
title: warmycat.com
---

這裡是 WarmyCat 的文章整理（GitHub Pages 測試中）。

<ul>
  {% assign items = site.pages | where_exp: "p", "p.path contains 'posts/'" | sort: "date" | reverse %}
  {% for p in items %}
    {% if p.date %}
      <li>
        <a href="{{ p.url | relative_url }}">{{ p.title }}</a>
        <small>({{ p.date | date: "%Y-%m-%d" }})</small>
      </li>
    {% endif %}
  {% endfor %}
</ul>
