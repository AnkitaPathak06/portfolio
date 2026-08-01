/* ==========================================================================
   Content editor.
   Reads and writes data/content.json in your GitHub repo through the REST API.
   Nothing is stored on a server: the token lives in sessionStorage for this tab.
   ========================================================================== */

(function () {
  'use strict';

  var API = 'https://api.github.com';
  var FILE = 'content.json';
  var IMG_DIR = 'files';

  var cfg = { owner: '', repo: '', branch: 'main', token: '' };
  var data = null;        // working copy
  var pristine = '';      // JSON of last published state
  var sha = null;         // sha of content.json
  var active = 'profile';
  var openSet = {};       // which list rows are expanded

  /* ---------- tiny helpers ---------- */

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(String(b64).replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) {
      return (o == null) ? undefined : o[k];
    }, obj);
  }
  function set(obj, path, val) {
    var parts = path.split('.'), last = parts.pop(), cur = obj;
    parts.forEach(function (k) {
      if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
      cur = cur[k];
    });
    cur[last] = val;
  }
  function slugify(s) {
    return String(s || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
  }
  function toast(msg, ms) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 2600);
  }

  /* ---------- github ---------- */

  function gh(path, opts) {
    opts = opts || {};
    return fetch(API + path, {
      method: opts.method || 'GET',
      headers: {
        'Authorization': 'Bearer ' + cfg.token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      if (r.status === 204) return {};
      return r.json().then(function (j) {
        if (!r.ok) {
          var m = j && j.message ? j.message : ('HTTP ' + r.status);
          if (r.status === 401) m = 'Token rejected. Check it was pasted in full and has not expired.';
          if (r.status === 403 && /not accessible/i.test(m)) {
            m = 'The token exists but has no permission for this repo. Two things to check on the ' +
              'token: Repository access must include "' + cfg.repo + '", and Permissions must have ' +
              'Contents set to "Read and write" (it defaults to No access).';
          }
          if (r.status === 404) m = 'Not found — check the username, repo name and branch.';
          if (r.status === 409) m = 'The file changed on GitHub since you loaded it. Hit Reload.';
          throw new Error(m);
        }
        return j;
      });
    });
  }

  function repoPath(file) {
    return '/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo) +
      '/contents/' + file;
  }

  var canWrite = true;

  function fetchContent() {
    // Check the repo first, then the file, so the error can name the real problem.
    return gh('/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo))
      .catch(function (e) {
        if (/not found/i.test(e.message)) {
          throw new Error('No repo called "' + cfg.repo + '" under "' + cfg.owner +
            '". Check the spelling in your browser address bar — GitHub turns spaces into hyphens.');
        }
        throw e;
      })
      .then(function (repo) {
        // permissions reflect what THIS token can do, so a read-only token is caught now
        canWrite = !!(repo.permissions && repo.permissions.push);
        return gh(repoPath(FILE) + '?ref=' + encodeURIComponent(cfg.branch)).catch(function (e) {
          if (/not found/i.test(e.message)) {
            throw new Error('Found the repo, but no ' + FILE + ' on branch "' + cfg.branch +
              '". Check that ' + FILE + ' is listed on your repo page.');
          }
          throw e;
        });
      })
      .then(function (j) {
        sha = j.sha;
        var parsed = JSON.parse(b64decode(j.content));
        data = parsed;
        pristine = JSON.stringify(parsed);
        return parsed;
      });
  }

  function putFile(file, contentB64, message, fileSha) {
    var body = { message: message, content: contentB64, branch: cfg.branch };
    if (fileSha) body.sha = fileSha;
    return gh(repoPath(file), { method: 'PUT', body: body });
  }

  /* ---------- schema ---------- */

  var SOCIAL_TYPES = ['github', 'linkedin', 'twitter', 'instagram', 'website'];

  var SECTIONS = [
    {
      key: 'profile', label: 'Profile', kind: 'object',
      hint: 'The hero section, your photo and the links in the footer.',
      fields: [
        { k: 'name', l: 'Name', t: 'text' },
        { k: 'role', l: 'Short role label', t: 'text' },
        { k: 'badge.show', l: 'Show the badge above the headline', t: 'check' },
        { k: 'badge.text', l: 'Badge text', t: 'text', hint: 'For example "Open to opportunities" or "Currently exploring AI". Untick above to hide it entirely.' },
        { k: 'headline', l: 'Headline', t: 'textarea' },
        { k: 'lede', l: 'Intro paragraph', t: 'textarea' },
        { k: 'logo', l: 'Logo', t: 'image',
          hint: 'Upload a logo image (PNG with transparency works best). Leave empty to use your initials in a circle.' },
        { k: 'photo', l: 'Photo', t: 'image', hint: 'Leave empty to drop the photo and let the text run full width.' },
        { k: 'photoAlt', l: 'Photo description', t: 'text', hint: 'Read aloud by screen readers.' },
        { k: 'resumeUrl', l: 'Résumé', t: 'file',
          hint: 'Upload your PDF, or paste a link. Empty hides the Download résumé button.' },
        { k: 'email', l: 'Email', t: 'email' },
        { k: 'location', l: 'Location', t: 'text' },
        { k: 'socials', l: 'Social links', t: 'socials' }
      ]
    },
    {
      key: 'roadmap', label: 'Roadmap', kind: 'list', titleKey: 'title', subKey: 'year',
      hint: 'The timeline rail. Order here is the order on the page, left to right.',
      blank: { year: '', title: '', meta: '', note: '', present: false },
      fields: [
        { k: 'year', l: 'Year or label', t: 'text', hint: 'A year, or "Now" for the current step.' },
        { k: 'title', l: 'Title', t: 'text' },
        { k: 'meta', l: 'Organisation', t: 'text' },
        { k: 'note', l: 'One-line note', t: 'textarea' },
        { k: 'present', l: 'Mark as current', t: 'check' }
      ]
    },
    {
      key: 'jobs', label: 'Experience', kind: 'list', titleKey: 'title', subKey: 'org',
      hint: 'Newest first reads best.',
      blank: { period: '', title: '', org: '', body: '', tags: [] },
      fields: [
        { k: 'period', l: 'Period', t: 'text', hint: 'For example 2023 — Present' },
        { k: 'title', l: 'Job title', t: 'text' },
        { k: 'org', l: 'Company', t: 'text' },
        { k: 'body', l: 'What you did', t: 'md', hint: 'Start lines with - for bullets.' },
        { k: 'tags', l: 'Tags', t: 'tags' }
      ]
    },
    {
      key: 'education', label: 'Education', kind: 'list', titleKey: 'degree', subKey: 'org',
      hint: '',
      blank: { year: '', degree: '', org: '', note: '' },
      fields: [
        { k: 'year', l: 'Year', t: 'text' },
        { k: 'degree', l: 'Qualification', t: 'text' },
        { k: 'org', l: 'Institution', t: 'text' },
        { k: 'note', l: 'Note', t: 'text' }
      ]
    },
    {
      key: 'projects', label: 'Projects', kind: 'list', titleKey: 'title', subKey: 'year',
      flagKey: 'featured', flagLabel: 'Featured',
      hint: 'Featured projects appear on the home page. Every project gets its own detail page.',
      blank: {
        slug: '', title: '', blurb: '', year: '', role: '', featured: false,
        cover: '', tags: [], stack: [], links: { live: '', repo: '' },
        gallery: [], attachments: [], content: ''
      },
      fields: [
        { k: 'title', l: 'Title', t: 'text' },
        { k: 'slug', l: 'Page address', t: 'slug', hint: 'Used in the URL. Change it and old links break.' },
        { k: 'blurb', l: 'One-line summary', t: 'textarea' },
        { k: 'year', l: 'Year', t: 'text' },
        { k: 'role', l: 'Your role', t: 'text' },
        { k: 'featured', l: 'Show on home page', t: 'check' },
        { k: 'cover', l: 'Cover image', t: 'image' },
        { k: 'tags', l: 'Tags', t: 'tags', hint: 'These become the filters on the projects page.' },
        { k: 'stack', l: 'Tools used', t: 'tags' },
        { k: 'links.live', l: 'Live link', t: 'text' },
        { k: 'links.repo', l: 'Source code link', t: 'text' },
        { k: 'content', l: 'Detail page', t: 'md', tall: true, hint: 'Markdown. ## makes a heading, - makes a bullet, **bold**, [text](url).' },
        { k: 'gallery', l: 'Gallery images', t: 'gallery',
          hint: 'Screenshots shown in a grid. Click Add image to upload from your computer.' },
        { k: 'attachments', l: 'Files and links', t: 'attachments',
          hint: 'PDFs, decks, certificates or any external link. Upload a file or paste a URL.' }
      ]
    },
    {
      key: 'certificates', label: 'Certificates', kind: 'list', titleKey: 'name', subKey: 'issuer',
      hint: '',
      blank: { name: '', issuer: '', year: '', url: '' },
      fields: [
        { k: 'name', l: 'Certificate', t: 'text' },
        { k: 'issuer', l: 'Issued by', t: 'text' },
        { k: 'year', l: 'Year', t: 'text' },
        { k: 'url', l: 'Verification link', t: 'text' }
      ]
    },
    {
      key: 'skills', label: 'Skills', kind: 'list', titleKey: 'label', subKey: null,
      hint: 'One group per category. Mark a few as core — those get a dot and a heavier chip.',
      blank: { label: '', items: [] },
      fields: [
        { k: 'label', l: 'Group name', t: 'text' },
        { k: 'items', l: 'Skills in this group', t: 'skillitems' }
      ]
    },
    {
      key: 'contact', label: 'Contact', kind: 'object',
      hint: 'The section at the bottom of the page.',
      fields: [
        { k: 'heading', l: 'Heading', t: 'text' },
        { k: 'blurb', l: 'Intro text', t: 'textarea' },
        { k: 'useGmail', l: 'Email button opens Gmail', t: 'check',
          hint: 'Ticked: opens Gmail compose in a new tab. Unticked: opens whatever mail app the visitor uses.' },
        { k: 'emailSubject', l: 'Pre-filled subject line', t: 'text' },
        { k: 'showForm', l: 'Also show a message form', t: 'check',
          hint: 'Off by default — the two buttons are usually enough.' },
        {
          k: 'formEndpoint', l: 'Form endpoint', t: 'text',
          hint: 'Only needed if the form is on. A Formspree endpoint sends messages to your inbox.'
        }
      ]
    },
    {
      key: 'theme', label: 'Appearance', kind: 'object',
      hint: 'Pick a ready-made palette, or set your own two colours. Everything else on the site is worked out from these, and the contrast is checked automatically so text always stays readable.',
      fields: [
        { k: 'preset', l: 'Ready-made palette', t: 'preset' },
        { k: 'accent', l: 'Accent colour', t: 'color',
          hint: 'Buttons, links, the timeline and the logo circle.' },
        { k: 'background', l: 'Page background', t: 'color',
          hint: 'The base colour of the page. Keep it very light — cards sit on top of it.' }
      ]
    },
    {
      key: 'meta', label: 'Site details', kind: 'object',
      hint: 'Browser tab title and the description search engines show.',
      fields: [
        { k: 'siteTitle', l: 'Browser tab title', t: 'text' },
        { k: 'description', l: 'Search description', t: 'textarea' }
      ]
    }
  ];

  function section(key) {
    return SECTIONS.filter(function (s) { return s.key === key; })[0];
  }

  /* ---------- dirty state ---------- */

  function isDirty() { return JSON.stringify(data) !== pristine; }

  function paintState(msg, cls) {
    var chip = el('stateChip');
    if (msg) { chip.textContent = msg; chip.className = 'chip ' + cls; return; }
    if (isDirty()) { chip.textContent = 'Unpublished changes'; chip.className = 'chip chip--dirty'; }
    else { chip.textContent = 'Published'; chip.className = 'chip chip--clean'; }
  }

  function touch() { paintState(); paintSide(); }

  /* ---------- sidebar ---------- */

  function paintSide() {
    el('side').innerHTML = SECTIONS.map(function (s) {
      var count = '';
      if (s.kind === 'list') count = '<span class="side__count">' + ((data[s.key] || []).length) + '</span>';
      return '<button class="side__btn' + (s.key === active ? ' is-active' : '') +
        '" data-sec="' + s.key + '">' + esc(s.label) + count + '</button>';
    }).join('');
  }

  /* ---------- field rendering ---------- */

  function fieldHtml(f, val, path) {
    var id = 'f_' + path.replace(/[^a-z0-9]/gi, '_');
    var h = '<div class="field">';

    if (f.t === 'check') {
      h += '<label class="check"><input type="checkbox" id="' + id + '" data-path="' + esc(path) +
        '" data-t="check"' + (val ? ' checked' : '') + '><span>' + esc(f.l) + '</span></label>';
      if (f.hint) h += '<p class="hint">' + esc(f.hint) + '</p>';
      return h + '</div>';
    }

    h += '<label for="' + id + '">' + esc(f.l) + '</label>';

    if (f.t === 'textarea' || f.t === 'md') {
      h += '<textarea id="' + id + '" data-path="' + esc(path) + '" data-t="text"' +
        (f.tall ? ' class="tall"' : '') + '>' + esc(val || '') + '</textarea>';
    } else if (f.t === 'tags') {
      h += '<input type="text" id="' + id + '" data-path="' + esc(path) + '" data-t="tags" value="' +
        esc((val || []).join(', ')) + '" placeholder="Comma separated">';
    } else if (f.t === 'image') {
      h += '<div class="imgrow">' +
        (val ? '<img class="thumb" src="' + esc(val) + '" alt="">' : '<span class="thumb"></span>') +
        '<input type="text" id="' + id + '" data-path="' + esc(path) + '" data-t="text" value="' +
        esc(val || '') + '" placeholder="assets/img/…">' +
        '<button type="button" class="btn btn--icon" data-upload="' + esc(path) + '">Upload</button>' +
        '</div>';
    } else if (f.t === 'color') {
      h += '<div class="colorrow">' +
        '<input type="color" id="' + id + '" data-path="' + esc(path) + '" data-t="text" value="' +
        esc(val || '#000000') + '">' +
        '<input type="text" data-path="' + esc(path) + '" data-t="text" value="' + esc(val || '') +
        '" placeholder="#565483" class="hexbox">' +
        '</div>';
    } else if (f.t === 'preset') {
      var PRESETS = {
        lavender: ['#565483', '#F4F3EF'], forest: ['#3F6152', '#F2F4F0'],
        clay: ['#8A5340', '#F6F1EC'], ink: ['#2F4562', '#F1F3F6'],
        plum: ['#6D3F5B', '#F6F1F4'], slate: ['#4A4F58', '#F3F3F2']
      };
      h += '<div class="swatches">' + Object.keys(PRESETS).map(function (k) {
        var pc = PRESETS[k];
        return '<button type="button" class="swatch' + (val === k ? ' is-active' : '') +
          '" data-preset="' + k + '" data-accent="' + pc[0] + '" data-bg="' + pc[1] + '">' +
          '<span class="swatch__dots"><i style="background:' + pc[1] + '"></i>' +
          '<i style="background:' + pc[0] + '"></i></span>' + k + '</button>';
      }).join('') + '</div>';
    } else if (f.t === 'file') {
      h += '<div class="imgrow">' +
        '<input type="text" id="' + id + '" data-path="' + esc(path) + '" data-t="text" value="' +
        esc(val || '') + '" placeholder="resume.pdf or https://…">' +
        '<button type="button" class="btn btn--icon" data-upload="' + esc(path) +
        '" data-any="1">Upload</button>' +
        (val ? '<a class="btn btn--icon" href="../' + esc(val) + '" target="_blank" rel="noopener">Open</a>' : '') +
        '</div>';
    } else if (f.t === 'gallery') {
      var imgs = (val || []).map(function (g, i) {
        var src = typeof g === 'string' ? g : (g && g.src) || '';
        var cap = (g && g.caption) || '';
        return '<div class="galrow">' +
          '<img class="thumb" src="' + esc(src) + '" alt="">' +
          '<input type="text" data-path="' + esc(path) + '.' + i + '.caption" data-t="text" value="' +
          esc(cap) + '" placeholder="Caption (optional)">' +
          '<button type="button" class="btn btn--icon btn--danger" data-galdel="' + esc(path) +
          '" data-i="' + i + '">&times;</button></div>';
      }).join('');
      h += imgs +
        '<button type="button" class="btn btn--icon" data-galadd="' + esc(path) + '">Add image</button>';
    } else if (f.t === 'attachments') {
      h += (val || []).map(function (a, i) {
        return '<div class="subitem">' +
          '<input type="text" data-path="' + esc(path) + '.' + i + '.label" data-t="text" value="' +
          esc(a.label || '') + '" placeholder="Label, e.g. Case study PDF" style="flex:0 0 40%">' +
          '<input type="text" data-path="' + esc(path) + '.' + i + '.url" data-t="text" value="' +
          esc(a.url || '') + '" placeholder="file or https://…">' +
          '<button type="button" class="btn btn--icon" data-upload="' + esc(path) + '.' + i +
          '.url" data-any="1">Upload</button>' +
          '<button type="button" class="btn btn--icon btn--danger" data-subdel="' + esc(path) +
          '" data-i="' + i + '">&times;</button></div>';
      }).join('') +
        '<button type="button" class="btn btn--icon" data-subadd="' + esc(path) +
        '" data-kind="attach">Add file or link</button>';
    } else if (f.t === 'socials') {
      h += (val || []).map(function (s, i) {
        var opts = SOCIAL_TYPES.map(function (t) {
          return '<option value="' + t + '"' + (s.type === t ? ' selected' : '') + '>' + t + '</option>';
        }).join('');
        return '<div class="subitem">' +
          '<select data-path="' + esc(path) + '.' + i + '.type" data-t="text" style="width:120px;flex:none">' + opts + '</select>' +
          '<input type="text" data-path="' + esc(path) + '.' + i + '.url" data-t="text" value="' + esc(s.url || '') + '" placeholder="https://…">' +
          '<button type="button" class="btn btn--icon btn--danger" data-subdel="' + esc(path) + '" data-i="' + i + '">&times;</button>' +
          '</div>';
      }).join('') +
        '<button type="button" class="btn btn--icon" data-subadd="' + esc(path) + '" data-kind="social">Add link</button>';
    } else if (f.t === 'skillitems') {
      h += (val || []).map(function (s, i) {
        return '<div class="subitem">' +
          '<input type="text" data-path="' + esc(path) + '.' + i + '.name" data-t="text" value="' + esc(s.name || '') + '" placeholder="Skill name">' +
          '<label class="check" style="flex:none"><input type="checkbox" data-path="' + esc(path) + '.' + i + '.core" data-t="check"' +
          (s.core ? ' checked' : '') + '><span style="font-size:.75rem">Core</span></label>' +
          '<button type="button" class="btn btn--icon btn--danger" data-subdel="' + esc(path) + '" data-i="' + i + '">&times;</button>' +
          '</div>';
      }).join('') +
        '<button type="button" class="btn btn--icon" data-subadd="' + esc(path) + '" data-kind="skill">Add skill</button>';
    } else {
      var type = f.t === 'email' ? 'email' : 'text';
      h += '<input type="' + type + '" id="' + id + '" data-path="' + esc(path) +
        '" data-t="' + (f.t === 'slug' ? 'slug' : 'text') + '" value="' + esc(val || '') + '">';
    }

    if (f.hint) h += '<p class="hint">' + esc(f.hint) + '</p>';
    return h + '</div>';
  }

  function fieldsHtml(sec, prefix, obj) {
    return sec.fields.map(function (f) {
      var path = prefix ? prefix + '.' + f.k : f.k;
      return fieldHtml(f, get(obj, f.k), path);
    }).join('');
  }

  /* ---------- editor rendering ---------- */

  function paintEditor() {
    var sec = section(active);
    el('secTitle').textContent = sec.label;
    el('secHint').textContent = sec.hint || '';
    var host = el('editor');

    if (sec.kind === 'object') {
      if (!data[sec.key]) data[sec.key] = {};
      host.innerHTML = '<div class="panel">' + fieldsHtml(sec, sec.key, data[sec.key]) + '</div>';
      return;
    }

    var list = data[sec.key] || (data[sec.key] = []);
    var rows = list.map(function (item, i) {
      var key = sec.key + ':' + i;
      var open = !!openSet[key];
      var title = get(item, sec.titleKey) || 'Untitled';
      var sub = sec.subKey ? (get(item, sec.subKey) || '') : '';
      var flag = (sec.flagKey && item[sec.flagKey])
        ? '<span class="flag">' + esc(sec.flagLabel) + '</span>' : '';

      return '<div class="item' + (open ? '' : ' is-collapsed') + '" data-i="' + i + '">' +
        '<div class="item__bar" data-toggle="' + i + '">' +
          '<span class="caret">&rsaquo;</span>' +
          '<span class="item__title">' + esc(title) + '</span>' +
          (sub ? '<span class="item__sub">' + esc(sub) + '</span>' : '') + flag +
          '<span class="item__tools">' +
            '<button type="button" class="btn btn--icon" data-move="' + i + '" data-dir="-1" title="Move up"' +
              (i === 0 ? ' disabled' : '') + '>&uarr;</button>' +
            '<button type="button" class="btn btn--icon" data-move="' + i + '" data-dir="1" title="Move down"' +
              (i === list.length - 1 ? ' disabled' : '') + '>&darr;</button>' +
            '<button type="button" class="btn btn--icon btn--danger" data-del="' + i + '" title="Delete">Delete</button>' +
          '</span>' +
        '</div>' +
        '<div class="item__body">' + fieldsHtml(sec, sec.key + '.' + i, item) + '</div>' +
      '</div>';
    }).join('');

    host.innerHTML = (rows || '<div class="empty-note">Nothing here yet. Add the first one.</div>') +
      '<button type="button" class="btn btn--primary" id="btnAdd" style="margin-top:.75rem">Add ' +
      esc(sec.label.replace(/s$/, '').toLowerCase()) + '</button>';
  }

  /* ---------- input handling ---------- */

  function readInput(input) {
    var path = input.getAttribute('data-path');
    var t = input.getAttribute('data-t');
    if (!path) return;
    var v;
    if (t === 'check') v = input.checked;
    else if (t === 'tags') {
      v = input.value.split(',').map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length; });
    } else if (t === 'slug') { v = slugify(input.value); }
    else v = input.value;
    set(data, path, v);
    if (path === 'theme.accent' || path === 'theme.background') data.theme.preset = 'custom';
    touch();
  }

  function wireEditor() {
    var host = el('editor');

    host.addEventListener('input', function (e) {
      var i = e.target;
      if (i.hasAttribute('data-path') && i.getAttribute('data-t') !== 'check') readInput(i);
    });
    host.addEventListener('change', function (e) {
      var i = e.target;
      if (i.hasAttribute('data-path')) readInput(i);
      if (i.getAttribute('data-t') === 'check' || i.tagName === 'SELECT') paintEditor();
    });
    host.addEventListener('blur', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-t') === 'slug') paintEditor();
    }, true);

    host.addEventListener('click', function (e) {
      var sec = section(active);
      var list = data[sec.key];
      var b = e.target.closest('button');

      var bar = e.target.closest('[data-toggle]');
      if (bar && !b) {
        var i = bar.getAttribute('data-toggle');
        var key = sec.key + ':' + i;
        openSet[key] = !openSet[key];
        paintEditor();
        return;
      }
      if (!b) return;

      if (b.id === 'btnAdd') {
        list.push(JSON.parse(JSON.stringify(sec.blank)));
        openSet[sec.key + ':' + (list.length - 1)] = true;
        touch(); paintEditor(); return;
      }
      if (b.hasAttribute('data-move')) {
        var from = +b.getAttribute('data-move'), dir = +b.getAttribute('data-dir');
        var to = from + dir;
        if (to < 0 || to >= list.length) return;
        var tmp = list[from]; list[from] = list[to]; list[to] = tmp;
        openSet = {};
        touch(); paintEditor(); return;
      }
      if (b.hasAttribute('data-del')) {
        var di = +b.getAttribute('data-del');
        var name = get(list[di], sec.titleKey) || 'this entry';
        if (!window.confirm('Delete "' + name + '"? This cannot be undone once published.')) return;
        list.splice(di, 1);
        openSet = {};
        touch(); paintEditor(); return;
      }
      if (b.hasAttribute('data-preset')) {
        data.theme = data.theme || {};
        data.theme.preset = b.getAttribute('data-preset');
        data.theme.accent = b.getAttribute('data-accent');
        data.theme.background = b.getAttribute('data-bg');
        touch(); paintEditor(); return;
      }
      if (b.hasAttribute('data-subadd')) {
        var p = b.getAttribute('data-subadd');
        var arr = get(data, p) || [];
        var kind = b.getAttribute('data-kind');
        arr.push(kind === 'social' ? { type: 'website', url: '' }
               : kind === 'attach' ? { label: '', url: '' }
               : { name: '', core: false });
        set(data, p, arr);
        touch(); paintEditor(); return;
      }
      if (b.hasAttribute('data-subdel')) {
        var sp = b.getAttribute('data-subdel');
        var sarr = get(data, sp) || [];
        sarr.splice(+b.getAttribute('data-i'), 1);
        touch(); paintEditor(); return;
      }
      if (b.hasAttribute('data-galdel')) {
        var gp = b.getAttribute('data-galdel');
        var garr = get(data, gp) || [];
        garr.splice(+b.getAttribute('data-i'), 1);
        touch(); paintEditor(); return;
      }
      if (b.hasAttribute('data-galadd')) {
        pickImage(b.getAttribute('data-galadd'), true, false); return;
      }
      if (b.hasAttribute('data-upload')) {
        pickImage(b.getAttribute('data-upload'), false, b.hasAttribute('data-any')); return;
      }
    });
  }

  /* ---------- image upload ---------- */

  var pendingTarget = null, pendingIsGallery = false;

  function pickImage(path, isGallery, anyType) {
    pendingTarget = path;
    pendingIsGallery = isGallery;
    var picker = el('filePicker');
    picker.value = '';
    picker.setAttribute('accept', anyType ? '' : 'image/*');
    picker.click();
  }

  el('filePicker').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file || !pendingTarget) return;
    if (file.size > 8 * 1024 * 1024) {
      toast('That file is over 8 MB. GitHub will reject it — compress it first.', 5000);
      return;
    }
    var name = slugify(file.name.replace(/\.[^.]+$/, '')) + '-' + Date.now() +
      '.' + (file.name.split('.').pop() || 'jpg').toLowerCase();
    var dest = IMG_DIR + '/' + name;

    toast('Uploading ' + file.name + '…', 6000);

    var reader = new FileReader();
    reader.onload = function () {
      var b64 = String(reader.result).split(',')[1];
      putFile(dest, b64, 'Add image ' + name, null).then(function () {
        if (pendingIsGallery) {
          var arr = get(data, pendingTarget) || [];
          arr.push({ src: dest, caption: '' });
          set(data, pendingTarget, arr);
        } else {
          set(data, pendingTarget, dest);
        }
        pendingTarget = null;
        touch(); paintEditor();
        toast('Uploaded. Click Publish to show it on the site.');
      }).catch(function (err) {
        toast('Upload failed: ' + err.message, 5000);
      });
    };
    reader.readAsDataURL(file);
  });

  /* ---------- publish ---------- */

  function publish() {
    if (!isDirty()) { toast('Nothing to publish.'); return; }
    var btn = el('btnPublish');
    btn.disabled = true;
    btn.textContent = 'Publishing…';
    paintState('Publishing', 'chip--dirty');

    var json = JSON.stringify(data, null, 2) + '\n';
    putFile(FILE, b64encode(json), 'Update site content', sha).then(function (res) {
      sha = res.content.sha;
      pristine = JSON.stringify(data);
      paintState();
      toast('Published. The live site updates in under a minute.', 4000);
    }).catch(function (err) {
      paintState('Failed', 'chip--err');
      toast(err.message, 6000);
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'Publish';
    });
  }

  /* ---------- boot ---------- */

  function startApp() {
    el('gate').classList.add('hide');
    el('app').classList.remove('hide');
    el('repoLabel').textContent = cfg.owner + '/' + cfg.repo + ' · ' + cfg.branch;
    paintSide();
    paintEditor();
    paintState();
    if (!canWrite) {
      paintState('Read only', 'chip--err');
      toast('Your token can read this repo but not write to it. Set Permissions → Contents → ' +
        'Read and write on the token, then reconnect. Editing now will not save.', 9000);
    }
  }

  function connect() {
    var err = el('gError');
    cfg.owner = el('gOwner').value.trim();
    cfg.repo = el('gRepo').value.trim();
    cfg.branch = el('gBranch').value.trim() || 'main';
    cfg.token = el('gToken').value.trim();

    if (!cfg.owner || !cfg.repo || !cfg.token) {
      err.textContent = 'Fill in the username, repository and token.';
      err.classList.remove('hide');
      return;
    }
    err.classList.add('hide');
    var btn = el('gConnect');
    btn.disabled = true; btn.textContent = 'Connecting…';

    fetchContent().then(function () {
      if (!canWrite) {
        throw new Error('This token can read the repo but not write to it, so Publish would fail. ' +
          'On the token, check BOTH of these: Repository access must be "Only select repositories" ' +
          'with ' + cfg.repo + ' ticked (not "Public repositories", which is read-only), and ' +
          'Permissions → Repository permissions → Contents must be "Read and write".');
      }
      if (el('gRemember').checked) {
        localStorage.setItem('pf_token', cfg.token);
        sessionStorage.removeItem('pf_token');
      } else {
        sessionStorage.setItem('pf_token', cfg.token);
        localStorage.removeItem('pf_token');
      }
      localStorage.setItem('pf_repo', JSON.stringify({
        owner: cfg.owner, repo: cfg.repo, branch: cfg.branch
      }));
      startApp();
    }).catch(function (e) {
      err.textContent = e.message;
      err.classList.remove('hide');
    }).then(function () {
      btn.disabled = false; btn.textContent = 'Connect';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var saved = localStorage.getItem('pf_repo');
    if (saved) {
      try {
        var s = JSON.parse(saved);
        el('gOwner').value = s.owner || '';
        el('gRepo').value = s.repo || '';
        el('gBranch').value = s.branch || 'main';
      } catch (e) { /* ignore */ }
    }
    var tok = localStorage.getItem('pf_token') || sessionStorage.getItem('pf_token');
    if (tok) {
      el('gToken').value = tok;
      if (localStorage.getItem('pf_token')) el('gRemember').checked = true;
    }

    el('gConnect').addEventListener('click', connect);
    el('gToken').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') connect();
    });

    el('side').addEventListener('click', function (e) {
      var b = e.target.closest('[data-sec]');
      if (!b) return;
      active = b.getAttribute('data-sec');
      openSet = {};
      paintSide(); paintEditor();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    el('btnPublish').addEventListener('click', publish);

    el('btnReload').addEventListener('click', function () {
      if (isDirty() && !window.confirm('Discard your unpublished changes and reload from GitHub?')) return;
      fetchContent().then(function () {
        openSet = {};
        paintSide(); paintEditor(); paintState();
        toast('Reloaded from GitHub.');
      }).catch(function (e) { toast(e.message, 5000); });
    });

    el('btnDisconnect').addEventListener('click', function () {
      if (isDirty() && !window.confirm(
        'You have unpublished changes that will be lost. Download JSON first if you want to keep ' +
        'them.\n\nDisconnect anyway?')) return;
      sessionStorage.removeItem('pf_token');
      localStorage.removeItem('pf_token');
      data = null;
      cfg.token = '';
      el('gToken').value = '';
      el('gRemember').checked = false;
      el('gError').classList.add('hide');
      el('app').classList.add('hide');
      el('gate').classList.remove('hide');
    });

    el('btnDownload').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'content.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    wireEditor();

    window.addEventListener('beforeunload', function (e) {
      if (data && isDirty()) { e.preventDefault(); e.returnValue = ''; }
    });

    if (tok && saved) connect();
  });
})();
