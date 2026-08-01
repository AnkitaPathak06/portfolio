/* ==========================================================================
   Portfolio front-end.
   Every page renders itself from data/content.json. Nothing is hardcoded,
   so the admin panel only ever has to rewrite that one file.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- icons ---------- */

  var ICONS = {
    mail: '<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m3 8 9 6 9-6"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    github: '<path d="M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 4.5-1.4 4.5-5a4 4 0 0 0-1.1-2.8 3.7 3.7 0 0 0-.1-2.8s-1.1-.3-3.5 1.3a8.6 8.6 0 0 0-4.6 0C7.3 3.6 6.2 3.9 6.2 3.9a3.7 3.7 0 0 0-.1 2.8A4 4 0 0 0 5 9.5c0 3.6 1.7 4.7 4.5 5-.6.6-.6 1.2-.5 2V20"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    twitter: '<path d="M4 4l7.5 9.5L4.5 20h2.5l5.5-5 4 5H20l-7.7-9.7L19.5 4H17l-5 4.6L8.5 4z"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/>',
    website: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m9 14.5-1.5 7L12 19l4.5 2.5L15 14.5"/>',
    school: '<path d="M22 9 12 4 2 9l10 5z"/><path d="M6 11.5V17c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5"/>',
    briefcase: '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M2 12h20"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15v3"/><path d="M12 9v9"/><path d="M17 5v13"/>',
    menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    check: '<path d="m5 13 4 4L19 7"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    paperclip: '<path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L10 17.9a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'
  };

  function icon(name, cls) {
    var d = ICONS[name] || ICONS.folder;
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }


  /* ---------- theme ---------- */

  var THEME_KEY = 'pf_theme';

  function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    var btn = el('themeToggle');
    if (btn) {
      btn.innerHTML = icon(mode === 'dark' ? 'sun' : 'moon');
      btn.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('title', mode === 'dark' ? 'Light mode' : 'Dark mode');
    }
  }

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* private mode */ }
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));

    var btn = el('themeToggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
        if (el('roadmapWrap')) drawSnake();
      });
    }
    // follow the system if the visitor has never chosen
    if (!saved && window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (e) { applyTheme(e.matches ? 'dark' : 'light'); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
    }
  }

  /* ---------- monogram ---------- */

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '—';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function el(id) { return document.getElementById(id); }
  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    // Block anything carrying a scheme other than http(s)/mailto — javascript:, data:, vbscript:.
    // A colon appearing after the first slash is part of a path, not a scheme.
    var colon = u.indexOf(':'), slash = u.indexOf('/');
    var hasScheme = colon > -1 && (slash === -1 || colon < slash);
    if (hasScheme) {
      return /^(https?|mailto):/i.test(u) ? u : '';
    }
    return u; // relative path: profile.jpg, images/shot.png, ./x, #anchor
  }

  /* Minimal markdown: headings, lists, bold, italic, code, links, images, quotes. */
  function md(src) {
    if (!src) return '';
    var lines = String(src).replace(/\r\n/g, '\n').split('\n');
    var out = [], list = null, para = [];

    function inline(t) {
      t = esc(t);
      t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, url) {
        var u = safeUrl(url.replace(/&amp;/g, '&'));
        return u ? '<img src="' + esc(u) + '" alt="' + alt + '">' : '';
      });
      t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, url) {
        var u = safeUrl(url.replace(/&amp;/g, '&'));
        return u ? '<a href="' + esc(u) + '" rel="noopener">' + txt + '</a>' : txt;
      });
      t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
      return t;
    }
    function flushPara() {
      if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; }
    }
    function closeList() { if (list) { out.push('</' + list + '>'); list = null; } }

    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) { flushPara(); closeList(); return; }

      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        flushPara(); closeList();
        var lvl = Math.min(Math.max(h[1].length, 2), 4);
        out.push('<h' + lvl + '>' + inline(h[2]) + '</h' + lvl + '>');
        return;
      }
      if (/^>\s?/.test(line)) {
        flushPara(); closeList();
        out.push('<blockquote>' + inline(line.replace(/^>\s?/, '')) + '</blockquote>');
        return;
      }
      var ul = line.match(/^[-*]\s+(.*)$/);
      var ol = line.match(/^\d+[.)]\s+(.*)$/);
      if (ul || ol) {
        flushPara();
        var want = ul ? 'ul' : 'ol';
        if (list !== want) { closeList(); out.push('<' + want + '>'); list = want; }
        out.push('<li>' + inline((ul || ol)[1]) + '</li>');
        return;
      }
      closeList();
      para.push(line);
    });
    flushPara(); closeList();
    return out.join('');
  }

  /* ---------- data ---------- */

  function loadContent() {
    if (window.__CONTENT__) return Promise.resolve(window.__CONTENT__);
    var base = document.body.getAttribute('data-root') || '';
    return fetch(base + 'content.json?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('content.json returned ' + r.status);
        return r.json();
      });
  }

  /* ---------- shared chrome ---------- */

  function renderChrome(c) {
    var p = c.profile || {};
    var root = document.body.getAttribute('data-root') || '';

    document.title = (c.meta && c.meta.siteTitle) || (p.name + ' — Portfolio');
    var descTag = document.querySelector('meta[name="description"]');
    if (descTag && c.meta && c.meta.description) descTag.setAttribute('content', c.meta.description);

    var brand = el('brand');
    if (brand) {
      brand.href = root + 'index.html';
      brand.innerHTML = '<span class="mono-mark">' + esc(initials(p.name)) + '</span>' +
        '<span class="nav__brandname">' + esc(p.name || 'Portfolio') + '</span>';
    }

    var year = el('footYear');
    if (year) year.textContent = new Date().getFullYear();
    var footName = el('footName');
    if (footName) footName.textContent = p.name || '';

    var social = el('social');
    if (social) {
      social.innerHTML = (p.socials || []).filter(function (s) { return safeUrl(s.url); })
        .map(function (s) {
          var key = String(s.type || 'website').toLowerCase();
          var name = ICONS[key] ? key : 'website';
          return '<a href="' + esc(safeUrl(s.url)) + '" target="_blank" rel="noopener noreferrer" ' +
            'aria-label="' + esc(s.type || 'Link') + '">' + icon(name) + '</a>';
        }).join('');
      if (p.email) {
        social.insertAdjacentHTML('beforeend',
          '<a href="mailto:' + esc(p.email) + '" aria-label="Email">' + icon('mail') + '</a>');
      }
    }
  }

  function initNav() {
    var nav = el('nav'), toggle = el('navToggle'), links = el('navLinks');
    var themeBtn = el('themeToggle');
    if (themeBtn && !themeBtn.innerHTML) {
      applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
    }
    if (nav) {
      var onScroll = function () { nav.classList.toggle('is-stuck', window.scrollY > 12); };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    if (toggle && links) {
      toggle.innerHTML = icon('menu');
      toggle.addEventListener('click', function () {
        var open = links.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.innerHTML = icon(open ? 'close' : 'menu');
      });
      links.addEventListener('click', function (e) {
        if (e.target.tagName === 'A' && links.classList.contains('is-open')) {
          links.classList.remove('is-open');
          toggle.innerHTML = icon('menu');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  /* ---------- scroll reveal ---------- */

  function initReveal() {
    var targets = document.querySelectorAll('.reveal, .stagger, .hero__grid');
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(targets, function (t) { t.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(targets, function (t) { io.observe(t); });
  }

  /* ---------- roadmap: alternating snake ---------- */

  var MIN_COL = 168; // below this a column is too cramped, so stack vertically

  function drawSnake() {
    var wrap = el('roadmapWrap');
    if (!wrap) return;
    var rail = el('snakeRail');
    var top = el('snakeTop'), bottom = el('snakeBottom');
    if (!rail || !top) return;

    var items = window.__ROADMAP__ || [];
    var n = items.length;
    if (!n) return;

    // stack vertically when columns would be too narrow
    var avail = wrap.clientWidth || 900;
    var stacked = (avail / n) < MIN_COL;
    wrap.classList.toggle('snake--stacked', stacked);
    if (stacked) return;

    var w = rail.clientWidth, h = rail.clientHeight;
    var mid = h / 2, amp = h / 2 - 13;
    var col = w / n;

    // a point per milestone, alternating above and below the centre line
    var pts = [];
    for (var i = 0; i < n; i++) {
      pts.push({ x: col * (i + 0.5), y: mid + (i % 2 === 0 ? -amp : amp) });
    }

    // smooth curve through the points with horizontal control handles
    var d = 'M0 ' + pts[0].y.toFixed(1) + ' L' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (var k = 1; k < pts.length; k++) {
      var a = pts[k - 1], b = pts[k], cx = (a.x + b.x) / 2;
      d += ' C' + cx.toFixed(1) + ' ' + a.y.toFixed(1) + ', ' +
                  cx.toFixed(1) + ' ' + b.y.toFixed(1) + ', ' +
                  b.x.toFixed(1) + ' ' + b.y.toFixed(1);
    }
    d += ' L' + w.toFixed(1) + ' ' + pts[pts.length - 1].y.toFixed(1);

    var dots = items.map(function (m, i) {
      var p = pts[i];
      var stemTop = i % 2 === 0 ? p.y : 0;
      var stemH = i % 2 === 0 ? (h - p.y) : p.y;
      return '<span class="snake__stem" style="left:' + p.x.toFixed(1) + 'px;top:' +
        (i % 2 === 0 ? p.y.toFixed(1) : '0') + 'px;height:' + Math.max(stemH, 0).toFixed(1) + 'px"></span>' +
        '<span class="snake__dot' + (m.present ? ' is-present' : '') +
        '" style="left:' + p.x.toFixed(1) + 'px;top:' + p.y.toFixed(1) + 'px"></span>';
    }).join('');

    rail.innerHTML =
      '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="rail-base" d="' + d + '"/><path class="rail-line" d="' + d + '"/></svg>' + dots;

    animateRail(rail);
  }

  function animateRail(rail) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var paths = rail.querySelectorAll('path');
    if (reduce || !paths.length) return;

    Array.prototype.forEach.call(paths, function (p, i) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.style.transition = 'stroke-dashoffset 1.7s cubic-bezier(0.22,0.61,0.36,1) ' + (i * 0.2) + 's';
    });

    var run = function () {
      Array.prototype.forEach.call(paths, function (p) { p.style.strokeDashoffset = 0; });
    };

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { run(); io.disconnect(); } });
      }, { threshold: 0.25 });
      io.observe(rail);
    } else { run(); }
  }

  /* ---------- project cards ---------- */

  function projectCard(pr, root) {
    var cover = safeUrl(pr.cover)
      ? '<img src="' + esc(root + pr.cover) + '" alt="' + esc(pr.title) + '" loading="lazy">'
      : icon('chart');
    var tags = (pr.tags || []).slice(0, 3)
      .map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');
    return '<a class="card card--hover project" href="' + esc(root) + 'project.html?slug=' +
      encodeURIComponent(pr.slug || '') + '">' +
      '<div class="project__cover">' + cover + '</div>' +
      '<div class="project__body">' +
      '<h3 class="project__title">' + esc(pr.title) + '</h3>' +
      '<p class="project__blurb">' + esc(pr.blurb) + '</p>' +
      '<div class="project__foot"><div class="tag-row">' + tags + '</div>' +
      '<span class="textlink">' + icon('arrowRight') + '</span></div>' +
      '</div></a>';
  }

  /* ---------- home page ---------- */

  function renderHome(c) {
    var p = c.profile || {}, root = '';

    var badge = el('heroBadge');
    if (badge) {
      var b = p.badge || {};
      if (b.show && b.text) {
        badge.innerHTML = '<span class="pill__dot"></span>' + esc(b.text);
      } else {
        badge.remove();
      }
    }

    var headline = el('heroHeadline');
    if (headline) headline.textContent = p.headline || '';
    var lede = el('heroLede');
    if (lede) lede.textContent = p.lede || '';

    var actions = el('heroActions');
    if (actions) {
      var html = '';
      if (safeUrl(p.resumeUrl)) {
        html += '<a class="btn btn--primary" href="' + esc(safeUrl(p.resumeUrl)) +
          '" target="_blank" rel="noopener">' + icon('download') + 'Download résumé</a>';
      }
      html += '<a class="btn btn--ghost" href="projects.html">' + icon('folder') + 'View my work</a>';
      actions.innerHTML = html;
    }

    var portrait = el('portrait');
    if (portrait) {
      if (safeUrl(p.photo)) {
        portrait.innerHTML = '<div class="portrait__frame"><img src="' + esc(p.photo) +
          '" alt="' + esc(p.photoAlt || p.name || 'Portrait') + '"></div>';
      } else {
        portrait.remove();
        var grid = document.querySelector('.hero__grid');
        if (grid) grid.style.gridTemplateColumns = '1fr';
      }
    }

    /* roadmap */
    var wrap = el('roadmapWrap');
    if (wrap) {
      var ms = c.roadmap || [];
      window.__ROADMAP__ = ms;
      wrap.style.setProperty('--cols', ms.length || 1);

      function cardHtml(m) {
        return '<article class="mstone' + (m.present ? ' is-present' : '') + '">' +
          '<p class="mstone__year">' + esc(m.year) + '</p>' +
          '<h3 class="mstone__title">' + esc(m.title) + '</h3>' +
          (m.meta ? '<p class="mstone__meta">' + esc(m.meta) + '</p>' : '') +
          (m.note ? '<p class="mstone__note">' + esc(m.note) + '</p>' : '') +
          '</article>';
      }

      el('snakeTop').innerHTML = ms.map(function (m, i) {
        return i % 2 === 0 ? cardHtml(m) : '<span></span>';
      }).join('');
      el('snakeBottom').innerHTML = ms.map(function (m, i) {
        return i % 2 === 1 ? cardHtml(m) : '<span></span>';
      }).join('');
      el('snakeVertical').innerHTML = ms.map(function (m) {
        return '<div class="snake__vitem' + (m.present ? ' is-present' : '') + '">' +
          cardHtml(m) + '</div>';
      }).join('');

      requestAnimationFrame(drawSnake);
    }

    /* jobs */
    var jobs = el('jobsGrid');
    if (jobs) {
      jobs.innerHTML = (c.jobs || []).map(function (j) {
        var tags = (j.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');
        return '<article class="card card--hover">' +
          '<p class="job__period">' + esc(j.period) + '</p>' +
          '<h3>' + esc(j.title) + '</h3>' +
          '<p class="job__org">' + esc(j.org) + '</p>' +
          '<div class="job__body">' + md(j.body) + '</div>' +
          (tags ? '<div class="tag-row">' + tags + '</div>' : '') +
          '</article>';
      }).join('');
    }

    /* education */
    var edu = el('eduGrid');
    if (edu) {
      edu.innerHTML = (c.education || []).map(function (e) {
        return '<article class="card card--hover"><div class="edu">' +
          '<span class="edu__icon">' + icon('school') + '</span><div>' +
          '<p class="job__period">' + esc(e.year) + '</p>' +
          '<h3>' + esc(e.degree) + '</h3>' +
          '<p class="job__org">' + esc(e.org) + '</p>' +
          (e.note ? '<p style="font-size:.875rem;margin:0">' + esc(e.note) + '</p>' : '') +
          '</div></div></article>';
      }).join('');
    }

    /* featured projects */
    var proj = el('projectsGrid');
    if (proj) {
      var featured = (c.projects || []).filter(function (x) { return x.featured; });
      var list = (featured.length ? featured : (c.projects || [])).slice(0, 3);
      proj.innerHTML = list.length
        ? list.map(function (pr) { return projectCard(pr, root); }).join('')
        : '<div class="empty">No projects yet.</div>';
    }

    /* certificates */
    var certs = el('certGrid');
    if (certs) {
      var cl = c.certificates || [];
      certs.innerHTML = cl.length ? cl.map(function (ct) {
        var inner = '<span class="cert__icon">' + icon('award') + '</span><div>' +
          '<h3 class="cert__name">' + esc(ct.name) + '</h3>' +
          '<p class="cert__meta">' + esc(ct.issuer) + (ct.year ? ' · ' + esc(ct.year) : '') + '</p></div>';
        return safeUrl(ct.url)
          ? '<a class="card card--hover cert" href="' + esc(safeUrl(ct.url)) +
            '" target="_blank" rel="noopener" style="text-decoration:none">' + inner + '</a>'
          : '<article class="card cert">' + inner + '</article>';
      }).join('') : '<div class="empty">No certificates yet.</div>';
    }

    /* skills */
    var skills = el('skillsWrap');
    if (skills) {
      skills.innerHTML = (c.skills || []).map(function (g) {
        return '<div class="skillgroup reveal">' +
          '<p class="skillgroup__label">' + esc(g.label) + '</p>' +
          '<div class="skillgroup__items">' + (g.items || []).map(function (s) {
            return '<span class="skill' + (s.core ? ' skill--core' : '') + '">' +
              (s.core ? '<span class="skill__dot"></span>' : '') + esc(s.name) + '</span>';
          }).join('') + '</div></div>';
      }).join('');
      var key = el('skillsKey');
      if (key) {
        key.innerHTML = '<span><span class="skill__dot"></span>Core strength</span>' +
          '<span>Everything else — working knowledge</span>';
      }
    }

    renderContact(c);
  }

  /* ---------- contact ---------- */

  function gmailCompose(to, subject) {
    return 'https://mail.google.com/mail/u/0/?to=' + encodeURIComponent(to) +
      '&su=' + encodeURIComponent(subject) + '&fs=1&tf=cm';
  }

  function renderContact(c) {
    var p = c.profile || {}, ct = c.contact || {};

    var heading = el('contactHeading');
    if (heading) heading.textContent = ct.heading || "Let's talk";
    var blurb = el('contactBlurb');
    if (blurb) blurb.textContent = ct.blurb || '';

    var linkedin = (p.socials || []).filter(function (s) {
      return String(s.type || '').toLowerCase() === 'linkedin' && safeUrl(s.url);
    })[0];

    /* the two big buttons */
    var actions = el('contactActions');
    if (actions) {
      var html = '';
      if (p.email) {
        var subject = ct.emailSubject || ('Hello ' + (p.name || '').split(' ')[0]);
        var href = ct.useGmail === false
          ? 'mailto:' + p.email + '?subject=' + encodeURIComponent(subject)
          : gmailCompose(p.email, subject);
        html += '<a class="contact__btn contact__btn--solid" href="' + esc(href) + '"' +
          (ct.useGmail === false ? '' : ' target="_blank" rel="noopener"') + '>' +
          icon('mail') + 'Email</a>';
      }
      if (linkedin) {
        html += '<a class="contact__btn contact__btn--outline" href="' + esc(safeUrl(linkedin.url)) +
          '" target="_blank" rel="noopener">' + icon('linkedin') + 'LinkedIn</a>';
      }
      actions.innerHTML = html;
    }

    var fallback = el('contactFallback');
    if (fallback) {
      fallback.innerHTML = p.email
        ? 'Or write to me at <a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a>.'
        : '';
    }

    var direct = el('contactDirect');
    if (direct) {
      var rows = '';
      if (p.location) {
        rows += '<span class="contact__row">' + icon('pin') + '<span>' + esc(p.location) + '</span></span>';
      }
      (p.socials || []).filter(function (s) {
        return safeUrl(s.url) && String(s.type || '').toLowerCase() !== 'linkedin';
      }).forEach(function (s) {
        var key = String(s.type || 'website').toLowerCase();
        rows += '<a class="contact__row" href="' + esc(safeUrl(s.url)) + '" target="_blank" rel="noopener">' +
          icon(ICONS[key] ? key : 'website') + '<span>' +
          esc(String(s.url).replace(/^https?:\/\//, '')) + '</span></a>';
      });
      direct.innerHTML = rows;
    }

    /* optional message form */
    var form = el('contactForm');
    if (!form) return;
    if (!ct.showForm) { form.remove(); return; }
    form.classList.remove('hide');

    var endpoint = safeUrl(ct.formEndpoint);
    var note = el('formNote');
    if (note) {
      note.textContent = endpoint
        ? 'Your message goes straight to my inbox.'
        : 'This opens your email app with the message ready to send.';
    }

    var submit = el('formSubmit');
    var status = el('formStatus');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var message = form.elements.message.value.trim();

      if (!name || !email || !message) {
        status.className = 'form__status is-err';
        status.textContent = 'Fill in your name, email and message.';
        return;
      }

      if (!endpoint) {
        window.location.href = 'mailto:' + encodeURIComponent(p.email || '') +
          '?subject=' + encodeURIComponent('Portfolio enquiry from ' + name) +
          '&body=' + encodeURIComponent(message + '\n\n—\n' + name + '\n' + email);
        status.className = 'form__status is-ok';
        status.textContent = 'Opening your email app…';
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Sending…';
      status.className = 'form__status';
      status.textContent = '';

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: name, email: email, message: message })
      }).then(function (r) {
        if (!r.ok) throw new Error('status ' + r.status);
        form.reset();
        status.className = 'form__status is-ok';
        status.textContent = 'Message sent. I will get back to you shortly.';
      }).catch(function () {
        status.className = 'form__status is-err';
        status.textContent = 'That did not go through. Email me directly at ' + (p.email || '') + '.';
      }).then(function () {
        submit.disabled = false;
        submit.innerHTML = icon('arrowRight') + 'Send message';
      });
    });

    if (submit) submit.innerHTML = icon('arrowRight') + 'Send message';
  }

  /* ---------- projects index ---------- */

  function renderProjectsPage(c) {
    var grid = el('allProjects');
    var filterWrap = el('projectFilters');
    if (!grid) return;
    var all = c.projects || [];
    var root = '';

    function paint(tag) {
      var list = tag === 'all' ? all : all.filter(function (p) {
        return (p.tags || []).indexOf(tag) !== -1;
      });
      grid.innerHTML = list.length
        ? list.map(function (p) { return projectCard(p, root); }).join('')
        : '<div class="empty">Nothing here with that tag yet.</div>';
      grid.classList.remove('is-in');
      requestAnimationFrame(function () { grid.classList.add('is-in'); });
    }

    if (filterWrap) {
      var tags = [];
      all.forEach(function (p) {
        (p.tags || []).forEach(function (t) { if (tags.indexOf(t) === -1) tags.push(t); });
      });
      filterWrap.innerHTML = ['all'].concat(tags).map(function (t, i) {
        return '<button class="filter' + (i === 0 ? ' is-active' : '') + '" data-tag="' + esc(t) + '">' +
          esc(t === 'all' ? 'All work' : t) + '</button>';
      }).join('');
      filterWrap.addEventListener('click', function (e) {
        var btn = e.target.closest('.filter');
        if (!btn) return;
        Array.prototype.forEach.call(filterWrap.children, function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        paint(btn.getAttribute('data-tag'));
      });
    }
    paint('all');

    var count = el('projectCount');
    if (count) count.textContent = all.length + (all.length === 1 ? ' project' : ' projects');
  }

  /* ---------- project detail ---------- */

  function renderProjectDetail(c) {
    var wrap = el('detail');
    if (!wrap) return;
    var slug = new URLSearchParams(window.location.search).get('slug');
    var pr = (c.projects || []).filter(function (p) { return p.slug === slug; })[0];

    if (!pr) {
      wrap.innerHTML = '<div class="shell"><div class="empty">' +
        '<p>That project does not exist.</p>' +
        '<a class="btn btn--ghost btn--sm" href="projects.html">See all projects</a></div></div>';
      return;
    }

    document.title = pr.title + ' — ' + ((c.profile || {}).name || 'Portfolio');

    var meta = '';
    if (pr.year) meta += '<div><dt>Year</dt><dd>' + esc(pr.year) + '</dd></div>';
    if (pr.role) meta += '<div><dt>Role</dt><dd>' + esc(pr.role) + '</dd></div>';
    if ((pr.stack || []).length) {
      meta += '<div><dt>Stack</dt><dd>' + esc((pr.stack || []).join(', ')) + '</dd></div>';
    }
    var links = '';
    if (safeUrl((pr.links || {}).live)) {
      links += '<a class="btn btn--primary btn--sm" href="' + esc(safeUrl(pr.links.live)) +
        '" target="_blank" rel="noopener">' + icon('external') + 'View live</a>';
    }
    if (safeUrl((pr.links || {}).repo)) {
      links += '<a class="btn btn--ghost btn--sm" href="' + esc(safeUrl(pr.links.repo)) +
        '" target="_blank" rel="noopener">' + icon('github') + 'Source</a>';
    }
    var galleryItems = (pr.gallery || []).map(function (g) {
      var src = typeof g === 'string' ? g : (g && g.src);
      var cap = (g && g.caption) || '';
      if (!safeUrl(src)) return '';
      return '<figure><a href="' + esc(safeUrl(src)) + '" target="_blank" rel="noopener">' +
        '<img src="' + esc(safeUrl(src)) + '" alt="' + esc(cap || pr.title) + '" loading="lazy"></a>' +
        (cap ? '<figcaption>' + esc(cap) + '</figcaption>' : '') + '</figure>';
    }).join('');

    var attachItems = (pr.attachments || []).filter(function (a) {
      return a && safeUrl(a.url);
    }).map(function (a) {
      var url = safeUrl(a.url);
      var isImg = /\.(png|jpe?g|gif|webp|svg)$/i.test(url);
      var kind = isImg ? 'image' : (/\.(pdf|docx?|pptx?|xlsx?|csv|zip)$/i.test(url) ? 'file' : 'paperclip');
      return '<a class="attach" href="' + esc(url) + '" target="_blank" rel="noopener">' +
        icon(kind) + '<span>' + esc(a.label || url.split('/').pop()) + '</span>' +
        '<span class="attach__go">' + icon('external') + '</span></a>';
    }).join('');

    wrap.innerHTML =
      '<div class="shell detail__head reveal">' +
        '<a class="textlink" href="projects.html">' + icon('arrowLeft') + 'All projects</a>' +
        '<h1 style="margin-top:1.25rem">' + esc(pr.title) + '</h1>' +
        '<p class="lede" style="margin-top:1rem">' + esc(pr.blurb) + '</p>' +
        (links ? '<div class="hero__actions">' + links + '</div>' : '') +
        (meta ? '<dl class="detail__meta">' + meta + '</dl>' : '') +
      '</div>' +
      '<div class="shell" style="padding-bottom:clamp(3rem,6vw,5rem)">' +
        '<div class="prose reveal">' + md(pr.content) + '</div>' +
        (galleryItems
          ? '<div class="reveal"><p class="eyebrow" style="margin-top:2.5rem">Gallery</p>' +
            '<div class="gallery">' + galleryItems + '</div></div>' : '') +
        (attachItems
          ? '<div class="reveal"><p class="eyebrow" style="margin-top:2.5rem">Files and links</p>' +
            '<div class="attachments">' + attachItems + '</div></div>' : '') +
      '</div>';

        initReveal();
  }

  /* ---------- boot ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initNav();

    loadContent().then(function (c) {
      renderChrome(c);
      var page = document.body.getAttribute('data-page');
      if (page === 'home') renderHome(c);
      if (page === 'projects') renderProjectsPage(c);
      if (page === 'project') renderProjectDetail(c);
      initReveal();
      window.addEventListener('resize', function () {
        clearTimeout(window.__rmT);
        window.__rmT = setTimeout(drawSnake, 160);
      });
    }).catch(function (err) {
      var main = document.querySelector('main');
      if (main) {
        main.innerHTML = '<div class="shell" style="padding:5rem 0"><div class="empty">' +
          '<p>Could not load site content.</p>' +
          '<p style="font-size:.8125rem">' + esc(err.message) + '</p></div></div>';
      }
    });
  });
})();
