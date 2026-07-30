/* ==========================================================================
   Content editor.
   Reads and writes data/content.json in your GitHub repo through the REST API.
   Nothing is stored on a server: the token lives in sessionStorage for this tab.
   ========================================================================== */

(function () {
  'use strict';

  var API = 'https://api.github.com';
  var FILE = 'content.json';
  var IMG_DIR = 'images';

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
          if (r.status === 401) m = 'Token rejected. Check it has not expired.';
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
      .then(function () {
        return gh(repoPath(FILE) + '?ref=' + encodeURIComponent(cfg.branch)).catch(function (e) {
          if (/not found/i.test(e.message)) {
            throw new Error('Found the repo, but no ' + FILE + ' on branch "' + cfg.branch +
              '". The files were probably uploaded inside a subfolder — on your repo page you should ' +
              'see index.html and the css, js, admin and data folders listed directly.');
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
        { k: 'photo', l: 'Photo', t: 'image', hint: 'Leave empty to drop the photo and let the text run full width.' },
        { k: 'photoAlt', l: 'Photo description', t: 'text', hint: 'Read aloud by screen readers.' },
        { k: 'resumeUrl', l: 'Résumé link', t: 'text', hint: 'Empty hides the Résumé button.' },
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
        cover: '', tags: [], stack: [], links: { live: '', repo: '' }, gallery: [], content: ''
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
        { k: 'gallery', l: 'Gallery images', t: 'gallery' }
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
        { k: 'showForm', l: 'Show the message form', t: 'check' },
        {
          k: 'formEndpoint', l: 'Form endpoint', t: 'text',
          hint: 'Paste a Formspree endpoint to receive messages in your inbox. Leave it empty and the form opens the visitor\'s email app instead — that works with no setup.'
        }
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
    } else if (f.t === 'gallery') {
      var imgs = (val || []).map(function (src, i) {
        return '<figure><img src="' + esc(src) + '" alt="">' +
          '<button type="button" class="btn btn--icon btn--danger" data-galdel="' + esc(path) +
          '" data-i="' + i + '" style="position:absolute;top:2px;right:2px;padding:1px 4px">&times;</button>' +
          '</figure>';
      }).join('');
      h += (imgs ? '<div class="gallery-grid">' + imgs + '</div>' : '') +
        '<button type="button" class="btn btn--icon" data-galadd="' + esc(path) + '">Add image</button>';
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
      if (b.hasAttribute('data-subadd')) {
        var p = b.getAttribute('data-subadd');
        var arr = get(data, p) || [];
        arr.push(b.getAttribute('data-kind') === 'social'
          ? { type: 'website', url: '' } : { name: '', core: false });
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
        pickImage(b.getAttribute('data-galadd'), true); return;
      }
      if (b.hasAttribute('data-upload')) {
        pickImage(b.getAttribute('data-upload'), false); return;
      }
    });
  }

  /* ---------- image upload ---------- */

  var pendingTarget = null, pendingIsGallery = false;

  function pickImage(path, isGallery) {
    pendingTarget = path;
    pendingIsGallery = isGallery;
    var picker = el('filePicker');
    picker.value = '';
    picker.click();
  }

  el('filePicker').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file || !pendingTarget) return;
    if (file.size > 4 * 1024 * 1024) {
      toast('That image is over 4 MB. Compress it first.', 4000);
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
          arr.push(dest);
          set(data, pendingTarget, arr);
        } else {
          set(data, pendingTarget, dest);
        }
        pendingTarget = null;
        touch(); paintEditor();
        toast('Image added. Publish to show it on the site.');
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
      sessionStorage.setItem('pf_token', cfg.token);
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
    var tok = sessionStorage.getItem('pf_token');
    if (tok) el('gToken').value = tok;

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
