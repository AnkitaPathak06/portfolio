/* Admin panel — edits content.json in the browser and commits it to GitHub.
   Everything lives in localStorage until you press Publish. */

const PASSCODE = "portfolio";           // change this
const LS = { draft: "pf_draft", cfg: "pf_cfg" };
let C = null;                            // working content
let cfg = { owner: "", repo: "", branch: "main", path: "", token: "" };
let loadedSha = null;                    // sha of content.json when the panel loaded it

/* ---------- gate ---------- */
function tryGate() {
  const v = document.getElementById("pass").value;
  if (v === PASSCODE) { sessionStorage.setItem("pf_ok", "1"); boot(); }
  else alert("Wrong passcode.");
}
if (sessionStorage.getItem("pf_ok")) setTimeout(boot, 0);

async function boot() {
  document.getElementById("gate").style.display = "none";
  document.getElementById("app").style.display = "block";
  cfg = Object.assign(cfg, JSON.parse(localStorage.getItem(LS.cfg) || "{}"));
  const draft = localStorage.getItem(LS.draft);
  if (draft) { C = JSON.parse(draft); setStatus("loaded unpublished draft"); }
  else {
    const r = await fetch("content.json?ts=" + Date.now(), { cache: "no-store" });
    C = await r.json();
    setStatus("loaded content.json");
  }
  document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => {
    document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("on", x === b));
    document.querySelectorAll(".panel").forEach(p => p.classList.toggle("on", p.id === "p-" + b.dataset.tab));
  });
  renderAll();
}
const setStatus = t => document.getElementById("status").textContent = t;
function save() {
  localStorage.setItem(LS.draft, JSON.stringify(C));
  setStatus("saved locally — not published yet");
}
function renderAll() { sections(); projects(); appearance(); details(); publishPanel(); share(); }
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- generic field helpers ---------- */
function field(label, value, oninput, type) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `<label>${esc(label)}</label>`;
  const el = document.createElement(type === "area" ? "textarea" : "input");
  if (type && type !== "area") el.type = type;
  el.value = value == null ? "" : value;
  el.oninput = () => { oninput(el.value); save(); };
  wrap.appendChild(el);
  return wrap;
}
function rowDiv(cls) { const d = document.createElement("div"); d.className = "row " + (cls || ""); return d; }
function itemBox(title, onDelete, onUp, onDown) {
  const box = document.createElement("div");
  box.className = "item";
  const top = document.createElement("div");
  top.className = "top";
  top.innerHTML = `<strong>${esc(title)}</strong>`;
  const mk = (t, fn) => { const b = document.createElement("button"); b.className = "btn small"; b.textContent = t; b.onclick = fn; return b; };
  if (onUp) top.appendChild(mk("↑", onUp));
  if (onDown) top.appendChild(mk("↓", onDown));
  if (onDelete) { const d = mk("Delete", onDelete); d.classList.add("danger"); top.appendChild(d); }
  box.appendChild(top);
  return box;
}
function move(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; save(); renderAll(); }

/* ---------- SECTIONS ---------- */
const SECTION_TYPES = {
  hero: "Hero", journey: "Journey timeline", experience: "Work experience",
  projects: "Project summaries", practice: "How I work", education: "Education",
  skills: "Skills", certifications: "Certifications", text: "Free text", contact: "Contact"
};

function sections() {
  const root = document.getElementById("p-sections");
  root.innerHTML = `<p class="hint">Drag is replaced by ↑ ↓ — reorder, hide, add or delete any section. Changes save locally; press <strong>Publish to GitHub</strong> when you want them live.</p>`;
  const bar = document.createElement("div");
  bar.className = "toolbar";
  Object.entries(SECTION_TYPES).forEach(([type, label]) => {
    const b = document.createElement("button");
    b.className = "btn small";
    b.textContent = "+ " + label;
    b.onclick = () => {
      const id = type + "-" + Math.random().toString(36).slice(2, 6);
      const base = { id, type, enabled: true, kicker: "", title: label };
      if (["journey", "experience", "practice", "education", "skills", "certifications"].includes(type)) base.items = [];
      if (["hero", "text", "practice"].includes(type)) base.body = "";
      if (type === "hero") base.headline = "";
      C.sections.push(base); save(); sections();
    };
    bar.appendChild(b);
  });
  root.appendChild(bar);

  C.sections.forEach((s, i) => {
    const card = document.createElement("div");
    card.className = "card";
    const h = document.createElement("header");
    h.innerHTML = `<span class="grip">≡</span><h3>${esc(s.title || SECTION_TYPES[s.type] || s.type)}</h3>
      <span class="hint">${esc(s.type)}</span>`;
    const tog = document.createElement("button"); tog.className = "btn small";
    tog.textContent = s.enabled === false ? "Hidden" : "Visible";
    tog.onclick = e => { e.stopPropagation(); s.enabled = s.enabled === false; save(); sections(); };
    const up = document.createElement("button"); up.className = "btn small"; up.textContent = "↑";
    up.onclick = e => { e.stopPropagation(); move(C.sections, i, -1); };
    const dn = document.createElement("button"); dn.className = "btn small"; dn.textContent = "↓";
    dn.onclick = e => { e.stopPropagation(); move(C.sections, i, 1); };
    const del = document.createElement("button"); del.className = "btn small danger"; del.textContent = "Delete";
    del.onclick = e => { e.stopPropagation(); if (confirm("Delete this section?")) { C.sections.splice(i, 1); save(); sections(); } };
    [tog, up, dn, del].forEach(b => h.appendChild(b));
    h.onclick = () => card.classList.toggle("open");
    card.appendChild(h);

    const body = document.createElement("div");
    body.className = "body";
    const NAV_DEFAULT = { experience: "Work experience", education: "Education", projects: "Projects", contact: "Contact" };
    const inMenu = s.navShow != null ? s.navShow : NAV_DEFAULT[s.type] != null;
    const menuWrap = document.createElement("div");
    const menuTog = document.createElement("label");
    menuTog.className = "toggle";
    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = inMenu;
    cb.onchange = () => { s.navShow = cb.checked; save(); sections(); };
    menuTog.appendChild(cb);
    menuTog.appendChild(document.createTextNode("Show in the top menu"));
    menuWrap.appendChild(menuTog);
    if (inMenu) menuWrap.appendChild(field("Menu label (keep it short)", s.navLabel || NAV_DEFAULT[s.type] || "", v => s.navLabel = v));
    body.appendChild(menuWrap);
    body.appendChild(field("Kicker (small line above the heading)", s.kicker, v => s.kicker = v));
    if (s.type !== "hero") body.appendChild(field("Heading", s.title, v => s.title = v));
    if (s.type === "hero") {
      body.appendChild(field("Headline", s.headline, v => s.headline = v, "area"));
      body.appendChild(field("Intro paragraph", s.body, v => s.body = v, "area"));
    }
    if (s.type === "practice" || s.type === "text") body.appendChild(field("Body paragraph", s.body, v => s.body = v, "area"));

    if (s.type === "journey") itemList(body, s, ["year", "title", "note"], ["Year", "Title", "Note"], { year: "", title: "", note: "" });
    if (s.type === "practice" || s.type === "skills") itemList(body, s, ["title", "note"], ["Title", "Note"], { title: "", note: "" });
    if (s.type === "certifications") itemList(body, s, ["title", "meta"], ["Title", "Where and when"], { title: "", meta: "" });
    if (s.type === "education") itemList(body, s, ["year", "degree", "institute", "note"], ["Year", "Degree", "Institute", "Context"], { year: "", degree: "", institute: "", note: "" });
    if (s.type === "experience") experienceList(body, s);
    if (s.type === "projects") body.insertAdjacentHTML("beforeend", `<p class="hint" style="margin-top:12px">The rows come from the <strong>Projects</strong> tab.</p>`);
    if (s.type === "contact") body.insertAdjacentHTML("beforeend", `<p class="hint" style="margin-top:12px">Email, location and links live in the <strong>Details</strong> tab.</p>`);

    card.appendChild(body);
    root.appendChild(card);
  });
}

function itemList(parent, s, keys, labels, blank) {
  s.items = s.items || [];
  const host = document.createElement("div");
  s.items.forEach((it, i) => {
    const box = itemBox(it[keys[0]] || it.title || "Item " + (i + 1),
      () => { s.items.splice(i, 1); save(); sections(); },
      () => move(s.items, i, -1), () => move(s.items, i, 1));
    const r = rowDiv(keys.length >= 4 ? "c4" : keys.length === 3 ? "c3" : "c2");
    keys.forEach((k, n) => r.appendChild(field(labels[n], it[k], v => it[k] = v, k === "note" || k === "meta" ? "area" : "text")));
    box.appendChild(r);
    host.appendChild(box);
  });
  const add = document.createElement("button");
  add.className = "btn small"; add.textContent = "+ Add entry";
  add.onclick = () => { s.items.push(Object.assign({}, blank)); save(); sections(); };
  parent.appendChild(host); parent.appendChild(add);
}

function experienceList(parent, s) {
  s.items = s.items || [];
  s.items.forEach((it, i) => {
    const box = itemBox(it.org || "Role " + (i + 1),
      () => { s.items.splice(i, 1); save(); sections(); },
      () => move(s.items, i, -1), () => move(s.items, i, 1));
    const r = rowDiv("c2");
    r.appendChild(field("Company", it.org, v => it.org = v));
    r.appendChild(field("Company note", it.orgNote, v => it.orgNote = v));
    r.appendChild(field("Role", it.role, v => it.role = v));
    r.appendChild(field("Period", it.period, v => it.period = v));
    box.appendChild(r);
    box.appendChild(field("Short summary", it.summary, v => it.summary = v, "area"));
    it.bullets = it.bullets || [];
    it.bullets.forEach((b, k) => {
      const wrap = document.createElement("div");
      wrap.appendChild(field("Bullet " + (k + 1), b, v => it.bullets[k] = v, "area"));
      const del = document.createElement("button");
      del.className = "btn small danger"; del.textContent = "Remove bullet";
      del.onclick = () => { it.bullets.splice(k, 1); save(); sections(); };
      wrap.appendChild(del);
      box.appendChild(wrap);
    });
    const add = document.createElement("button");
    add.className = "btn small"; add.textContent = "+ Add bullet";
    add.onclick = () => { it.bullets.push(""); save(); sections(); };
    box.appendChild(add);
    parent.appendChild(box);
  });
  const addRole = document.createElement("button");
  addRole.className = "btn small"; addRole.textContent = "+ Add role";
  addRole.onclick = () => { s.items.push({ org: "", orgNote: "", role: "", period: "", summary: "", bullets: [] }); save(); sections(); };
  parent.appendChild(addRole);
}

/* ---------- PROJECTS ---------- */
function projects() {
  const root = document.getElementById("p-projects");
  root.innerHTML = `<p class="hint">Each project gets its own page at <code>project.html?p=slug</code>. Slides shown in the click-through deck; documents and code links appear as cards.</p>`;
  const add = document.createElement("button");
  add.className = "btn small"; add.textContent = "+ Add project";
  add.style.margin = "14px 0";
  add.onclick = () => {
    C.projects.push({
      slug: "project-" + (C.projects.length + 1), num: String(C.projects.length + 1).padStart(2, "0"),
      title: "New project", org: "", period: "", role: "", summary: "", intro: "", cover: "",
      stats: [], objective: "", did: [], resultText: "", conclusion: "", slides: [],
      downloads: [], code: { label: "Repository", note: "GitHub", url: "" }
    });
    save(); projects();
  };
  root.appendChild(add);

  C.projects.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "card";
    const h = document.createElement("header");
    h.innerHTML = `<span class="grip">≡</span><h3>${esc(p.num)} · ${esc(p.title)}</h3>`;
    const up = document.createElement("button"); up.className = "btn small"; up.textContent = "↑";
    up.onclick = e => { e.stopPropagation(); move(C.projects, i, -1); };
    const dn = document.createElement("button"); dn.className = "btn small"; dn.textContent = "↓";
    dn.onclick = e => { e.stopPropagation(); move(C.projects, i, 1); };
    const del = document.createElement("button"); del.className = "btn small danger"; del.textContent = "Delete";
    del.onclick = e => { e.stopPropagation(); if (confirm("Delete this project?")) { C.projects.splice(i, 1); save(); projects(); } };
    [up, dn, del].forEach(b => h.appendChild(b));
    h.onclick = () => card.classList.toggle("open");
    card.appendChild(h);

    const b = document.createElement("div");
    b.className = "body";
    const r1 = rowDiv("c3");
    r1.appendChild(field("Number", p.num, v => p.num = v));
    r1.appendChild(field("URL slug", p.slug, v => p.slug = v.trim().replace(/\s+/g, "-").toLowerCase()));
    r1.appendChild(field("Role / discipline", p.role, v => p.role = v));
    b.appendChild(r1);
    b.appendChild(field("Title", p.title, v => p.title = v));
    const r2 = rowDiv("c2");
    r2.appendChild(field("Organisation", p.org, v => p.org = v));
    r2.appendChild(field("Period", p.period, v => p.period = v));
    b.appendChild(r2);
    b.appendChild(field("One-line summary (homepage row)", p.summary, v => p.summary = v, "area"));
    b.appendChild(field("Intro (project page hero)", p.intro, v => p.intro = v, "area"));
    b.appendChild(field("Objective", p.objective, v => p.objective = v, "area"));

    p.did = p.did || [];
    b.insertAdjacentHTML("beforeend", `<label>What I did</label>`);
    p.did.forEach((d, k) => {
      const wrap = document.createElement("div");
      wrap.appendChild(field("Paragraph " + (k + 1), d, v => p.did[k] = v, "area"));
      const x = document.createElement("button"); x.className = "btn small danger"; x.textContent = "Remove";
      x.onclick = () => { p.did.splice(k, 1); save(); projects(); };
      wrap.appendChild(x); b.appendChild(wrap);
    });
    const addDid = document.createElement("button");
    addDid.className = "btn small"; addDid.textContent = "+ Add paragraph";
    addDid.onclick = () => { p.did.push(""); save(); projects(); };
    b.appendChild(addDid);

    b.appendChild(field("Result", p.resultText, v => p.resultText = v, "area"));
    b.appendChild(field("Conclusion", p.conclusion, v => p.conclusion = v, "area"));

    p.stats = p.stats || [];
    b.insertAdjacentHTML("beforeend", `<label>Headline figures (first two also show in Result)</label>`);
    p.stats.forEach((s, k) => {
      const r = rowDiv("c3");
      r.appendChild(field("Value", s.value, v => s.value = v));
      r.appendChild(field("Label", s.label, v => s.label = v));
      const x = document.createElement("button"); x.className = "btn small danger"; x.textContent = "Remove";
      x.style.alignSelf = "end"; x.onclick = () => { p.stats.splice(k, 1); save(); projects(); };
      r.appendChild(x); b.appendChild(r);
    });
    const addStat = document.createElement("button");
    addStat.className = "btn small"; addStat.textContent = "+ Add figure";
    addStat.onclick = () => { p.stats.push({ value: "", label: "" }); save(); projects(); };
    b.appendChild(addStat);

    b.insertAdjacentHTML("beforeend", '<label>Deck</label><p class="hint" style="margin-bottom:6px">' +
      'Paste a Google Slides link (Share \u2192 Anyone with the link \u2192 Viewer) and the deck shows on the page. ' +
      'Leave it empty to use uploaded slide images instead.</p>');
    b.appendChild(field("Google Slides link", p.slidesUrl, v => { p.slidesUrl = v.trim(); save(); }, "url"));
    b.appendChild(field("Side panel heading", p.deckAboutTitle, v => { p.deckAboutTitle = v; save(); }));
    b.appendChild(field("About the deck (shows beside it)", p.deckAbout, v => { p.deckAbout = v; save(); }, "area"));
    const shape = document.createElement("div");
    shape.innerHTML = '<label>Slide shape</label>';
    const sel = document.createElement("select");
    [["16:9", "Widescreen 16:9"], ["4:3", "Standard 4:3"]].forEach(([v, t]) => {
      const o = document.createElement("option");
      o.value = v; o.textContent = t;
      if ((p.deckRatio || "16:9") === v) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = () => { p.deckRatio = sel.value; save(); };
    shape.appendChild(sel);
    shape.insertAdjacentHTML("beforeend", '<p class="hint" style="margin-top:5px">Pick the shape of your slides so there are no black bars around them.</p>');
    b.appendChild(shape);
    imageField(b, "Cover image", p.cover, v => { p.cover = v; save(); projects(); }, "cover-" + p.slug);
    slideField(b, p);

    p.downloads = p.downloads || [];
    b.insertAdjacentHTML("beforeend", `<label>Downloadable documents</label>`);
    p.downloads.forEach((d, k) => {
      const r = rowDiv("c3");
      r.appendChild(field("Label", d.label, v => d.label = v));
      r.appendChild(field("Note", d.note, v => d.note = v));
      const holder = document.createElement("div");
      holder.appendChild(field("URL or uploaded file", d.url, v => d.url = v));
      const up2 = document.createElement("button"); up2.className = "btn small"; up2.textContent = "Upload file";
      up2.onclick = () => pickFile(f => uploadAsset(f).then(url => { d.url = url; d.fileName = f.name; save(); projects(); }));
      const x = document.createElement("button"); x.className = "btn small danger"; x.textContent = "Remove";
      x.onclick = () => { p.downloads.splice(k, 1); save(); projects(); };
      holder.appendChild(up2); holder.appendChild(x);
      r.appendChild(holder);
      b.appendChild(r);
    });
    const addDl = document.createElement("button");
    addDl.className = "btn small"; addDl.textContent = "+ Add document";
    addDl.onclick = () => { p.downloads.push({ label: "", note: "", url: "" }); save(); projects(); };
    b.appendChild(addDl);

    p.code = p.code || { label: "Repository", note: "GitHub", url: "" };
    const rc = rowDiv("c3");
    rc.appendChild(field("Code label", p.code.label, v => p.code.label = v));
    rc.appendChild(field("Code note", p.code.note, v => p.code.note = v));
    rc.appendChild(field("Code URL", p.code.url, v => p.code.url = v, "url"));
    b.appendChild(rc);

    card.appendChild(b);
    root.appendChild(card);
  });
}

function imageField(parent, label, value, set, key) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `<label>${esc(label)}</label>`;
  const drop = document.createElement("div");
  drop.className = "drop";
  drop.textContent = value ? value : "Click or drop an image here";
  drop.onclick = () => pickFile(f => uploadAsset(f).then(set), "image/*");
  drop.ondragover = e => { e.preventDefault(); drop.classList.add("hot"); };
  drop.ondragleave = () => drop.classList.remove("hot");
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove("hot"); const f = e.dataTransfer.files[0]; if (f) uploadAsset(f).then(set); };
  wrap.appendChild(drop);
  if (value) {
    const t = document.createElement("div"); t.className = "thumbs";
    t.innerHTML = `<div class="thumb"><img src="${esc(value)}" alt=""></div>`;
    const clr = document.createElement("button"); clr.className = "btn small danger"; clr.textContent = "Clear";
    clr.onclick = () => set("");
    t.appendChild(clr);
    wrap.appendChild(t);
  }
  parent.appendChild(wrap);
}

function slideField(parent, p) {
  p.slides = p.slides || [];
  const wrap = document.createElement("div");
  wrap.innerHTML = `<label>Deck slides (export your PPT as images, in order)</label>`;
  const drop = document.createElement("div");
  drop.className = "drop";
  drop.textContent = "Click or drop slide images here — you can select several at once";
  const take = files => {
    const list = [...files];
    (async () => { for (const f of list) { const url = await uploadAsset(f); p.slides.push(url); } save(); projects(); })();
  };
  drop.onclick = () => pickFile(take, "image/*", true);
  drop.ondragover = e => { e.preventDefault(); drop.classList.add("hot"); };
  drop.ondragleave = () => drop.classList.remove("hot");
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove("hot"); take(e.dataTransfer.files); };
  wrap.appendChild(drop);
  const t = document.createElement("div");
  t.className = "thumbs";
  p.slides.forEach((s, k) => {
    const d = document.createElement("div");
    d.className = "thumb";
    d.innerHTML = `<img src="${esc(s)}" alt="Slide ${k + 1}"><button title="Remove">×</button>`;
    d.querySelector("button").onclick = () => { p.slides.splice(k, 1); save(); projects(); };
    t.appendChild(d);
  });
  wrap.appendChild(t);
  parent.appendChild(wrap);
}

function pickFile(cb, accept, multiple) {
  const i = document.createElement("input");
  i.type = "file";
  if (accept) i.accept = accept;
  if (multiple) i.multiple = true;
  i.onchange = () => { if (i.files.length) cb(multiple ? i.files : i.files[0]); };
  i.click();
}

/* ---------- APPEARANCE ---------- */
const PALETTES = {
  band: ["#2f5d57", "#3a5a7a", "#7a4a3c", "#5c4a7a", "#4a6b3f", "#1e2b26"],
  accent: ["#b68235", "#9a7b4f", "#a8563c", "#4f7d6a", "#8a6b9a"],
  bg: ["#f7f4ee", "#f3f2f2", "#f6f1e7", "#eef1ec", "#eff1f4"],
  brand: ["#f7f4ee", "#e1ad66", "#b68235", "#e8d9b8", "#ffffff"]
};
function appearance() {
  const root = document.getElementById("p-appearance");
  const t = C.theme;
  root.innerHTML = `<p class="hint">Changes apply to every page. Preview before publishing.</p>`;
  if (!t.brandColor) t.brandColor = t.bg;
  const mk = (label, key, list) => {
    const w = document.createElement("div");
    w.innerHTML = `<label>${label}</label>`;
    const s = document.createElement("div"); s.className = "swatches";
    list.forEach(c => {
      const b = document.createElement("button");
      b.style.background = c;
      if (t[key] === c) b.classList.add("on");
      b.onclick = () => { t[key] = c; save(); appearance(); };
      s.appendChild(b);
    });
    const custom = document.createElement("input");
    custom.type = "color"; custom.value = t[key]; custom.style.width = "44px"; custom.style.padding = "2px";
    custom.oninput = () => { t[key] = custom.value; save(); };
    s.appendChild(custom);
    w.appendChild(s);
    root.appendChild(w);
  };
  mk("Band colour (hero, contact)", "band", PALETTES.band);
  mk("Accent colour", "accent", PALETTES.accent);
  mk("Page background", "bg", PALETTES.bg);
  mk("Your name, top left", "brandColor", PALETTES.brand);

  const fonts = ["Cormorant Garamond", "Playfair Display", "EB Garamond", "Libre Baskerville", "Source Serif 4", "Lora"];
  const sel = (label, key) => {
    const w = document.createElement("div");
    w.innerHTML = `<label>${label}</label>`;
    const s = document.createElement("select");
    fonts.forEach(f => { const o = document.createElement("option"); o.value = f; o.textContent = f; if (C.theme[key] === f) o.selected = true; s.appendChild(o); });
    s.onchange = () => { C.theme[key] = s.value; save(); };
    w.appendChild(s); root.appendChild(w);
  };
  sel("Heading font", "headingFont");
  sel("Body font", "bodyFont");

  const num = (label, key, min, max, step, unit) => {
    const w = document.createElement("div");
    w.innerHTML = `<label>${label}</label>`;
    const i = document.createElement("input");
    i.type = "range"; i.min = min; i.max = max; i.step = step; i.value = C.theme[key];
    const out = document.createElement("span"); out.className = "hint"; out.textContent = " " + C.theme[key] + unit;
    i.oninput = () => { C.theme[key] = +i.value; out.textContent = " " + i.value + unit; save(); };
    w.appendChild(i); w.appendChild(out); root.appendChild(w);
  };
  num("Base text size", "baseSize", 14, 19, 1, "px");
  num("Space between sections", "sectionSpacing", 48, 140, 4, "px");

  const tg = (label, key) => {
    const w = document.createElement("label");
    w.className = "toggle";
    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = C.theme[key] !== false;
    cb.onchange = () => { C.theme[key] = cb.checked; save(); };
    w.appendChild(cb); w.appendChild(document.createTextNode(label));
    root.appendChild(w);
  };
  tg("Animations on", "animations");
  tg("Show photograph in hero", "showPhoto");
}

/* ---------- DETAILS ---------- */
function details() {
  const root = document.getElementById("p-details");
  root.innerHTML = "";
  const m = C.meta;
  root.appendChild(field("Name", m.name, v => m.name = v));
  root.appendChild(field("Tagline", m.tagline, v => m.tagline = v));
  if (!m.email || /example\.com$/i.test(m.email)) {
    root.insertAdjacentHTML("beforeend", '<p class="warn" style="margin-top:12px;border-left-color:#8a3b2f">' +
      'Your email is still the placeholder <code>' + esc(m.email || "(empty)") + '</code>, so the <strong>Email me</strong> button goes nowhere. Put your real address in the field below and publish.</p>');
  }
  const r = rowDiv("c2");
  r.appendChild(field("Email (the Email me button uses this)", m.email, v => m.email = v, "email"));
  r.appendChild(field("LinkedIn URL", m.linkedin, v => m.linkedin = v, "url"));
  root.appendChild(r);
  root.appendChild(field("Location line", m.location, v => m.location = v));
  const rr = rowDiv("c2");
  rr.appendChild(field("Resume file URL", m.resumeUrl, v => m.resumeUrl = v));
  rr.appendChild(field("Downloaded filename", m.resumeName, v => m.resumeName = v));
  const up = document.createElement("div");
  up.innerHTML = `<label>Upload résumé</label>`;
  const b = document.createElement("button"); b.className = "btn small"; b.textContent = "Choose file";
  b.onclick = () => pickFile(f => uploadAsset(f).then(url => { m.resumeUrl = url; m.resumeName = f.name; save(); details(); }));
  up.appendChild(b); rr.appendChild(up);
  root.appendChild(rr);
  imageField(root, "Photograph", m.photo, v => { m.photo = v; save(); details(); }, "photo");
  root.appendChild(field("Photo caption", m.photoCaption, v => m.photoCaption = v));

  C.extras = C.extras || [];
  root.insertAdjacentHTML("beforeend", `<label>“Also worth mentioning” (projects page)</label>`);
  C.extras.forEach((x, i) => {
    const box = itemBox(x.title || "Entry " + (i + 1), () => { C.extras.splice(i, 1); save(); details(); },
      () => move(C.extras, i, -1), () => move(C.extras, i, 1));
    box.appendChild(field("Title", x.title, v => x.title = v));
    box.appendChild(field("Note", x.note, v => x.note = v, "area"));
    root.appendChild(box);
  });
  const add = document.createElement("button");
  add.className = "btn small"; add.textContent = "+ Add entry";
  add.onclick = () => { C.extras.push({ title: "", note: "" }); save(); details(); };
  root.appendChild(add);
}

/* ---------- GITHUB PUBLISH ---------- */
function publishPanel() {
  const root = document.getElementById("p-publish");
  root.innerHTML = `<p class="warn">The token is stored in this browser only (localStorage) and is never committed. Use a fine-grained personal access token limited to this one repository with <strong>Contents: read and write</strong>. If you ever paste it somewhere public, revoke it on GitHub.</p>`;
  const r = rowDiv("c2");
  r.appendChild(field("GitHub username / owner", cfg.owner, v => { cfg.owner = v.trim(); saveCfg(); }));
  r.appendChild(field("Repository name", cfg.repo, v => { cfg.repo = v.trim(); saveCfg(); }));
  r.appendChild(field("Branch", cfg.branch, v => { cfg.branch = v.trim() || "main"; saveCfg(); }));
  r.appendChild(field("Folder in repo (blank = repo root)", cfg.path, v => { cfg.path = v.replace(/^\/|\/$/g, ""); saveCfg(); publishPanel(); }));
  root.appendChild(r);
  root.appendChild(field("Personal access token", cfg.token, v => { cfg.token = v.trim(); saveCfg(); }, "password"));
  if (cfg.path && cfg.repo && cfg.path.toLowerCase() === cfg.repo.toLowerCase()) {
    root.insertAdjacentHTML("beforeend",
      '<p class="warn" style="margin-top:14px;border-left-color:#8a3b2f">' +
      'The folder is set to <strong>' + esc(cfg.path) + '</strong>, which is your repository name, not a folder inside it. ' +
      'If your files sit at the top level of the repo, clear this field.</p>');
  }
  root.insertAdjacentHTML("beforeend", '<p class="hint" style="margin-top:14px">Path the panel will write to: <code>' +
    esc(repoPath("content.json")) + '</code></p>');

  const bar = document.createElement("div");
  bar.className = "toolbar";
  const pub = document.createElement("button"); pub.className = "btn gold"; pub.textContent = "Publish to GitHub";
  pub.onclick = publish;
  const dl = document.createElement("button"); dl.className = "btn"; dl.textContent = "Download content.json";
  dl.onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(C, null, 2)], { type: "application/json" }));
    a.download = "content.json"; a.click();
  };
  const test = document.createElement("button"); test.className = "btn"; test.textContent = "Test connection";
  test.onclick = testConnection;
  const rev = document.createElement("button"); rev.className = "btn danger"; rev.textContent = "Discard local draft";
  rev.onclick = () => { if (confirm("Throw away unpublished changes?")) { localStorage.removeItem(LS.draft); location.reload(); } };
  [pub, test, dl, rev].forEach(b => bar.appendChild(b));
  root.appendChild(bar);
  const log = document.createElement("div");
  log.className = "log"; log.id = "log"; log.textContent = "Ready.";
  root.appendChild(log);
}
function saveCfg() { localStorage.setItem(LS.cfg, JSON.stringify(cfg)); }
function logLine(t) {
  const l = document.getElementById("log");
  if (l) { l.textContent += "\n" + t; l.scrollTop = l.scrollHeight; }
}

function api(path) {
  return `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
}
function repoPath(name) { return (cfg.path ? cfg.path + "/" : "") + name; }

async function ghGet(path) {
  const r = await fetch(api(path) + "?ref=" + encodeURIComponent(cfg.branch) + "&ts=" + Date.now(), {
    cache: "no-store",
    headers: { Authorization: "Bearer " + cfg.token, Accept: "application/vnd.github+json" }
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("GitHub GET " + r.status + " — " + (await r.text()).slice(0, 200));
  return r.json();
}
async function ghPut(path, base64, message, attempt) {
  attempt = attempt || 1;
  const existing = await ghGet(path);
  const r = await fetch(api(path), {
    method: "PUT",
    cache: "no-store",
    headers: { Authorization: "Bearer " + cfg.token, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: base64, branch: cfg.branch, sha: existing ? existing.sha : undefined })
  });
  if (r.status === 409 && attempt < 4) {
    // the file moved under us (or GitHub served a stale sha) — re-read and retry
    logLine("sha conflict, re-reading and retrying (" + attempt + ")…");
    await new Promise(res => setTimeout(res, 700 * attempt));
    return ghPut(path, base64, message, attempt + 1);
  }
  if (!r.ok) throw new Error("GitHub PUT " + r.status + " — " + (await r.text()).slice(0, 300));
  return r.json();
}
const b64 = str => btoa(unescape(encodeURIComponent(str)));

let lastUploadName = "";
async function uploadAsset(file) {
  lastUploadName = file.name;
  if (!cfg.token || !cfg.owner || !cfg.repo) {
    // no token yet — keep it local so the panel still previews
    return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(file); });
  }
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.\-]+/g, "-");
  const name = "assets/" + Date.now().toString(36) + "-" + safe;
  const buf = await file.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  logLine("uploading " + name + " (" + Math.round(file.size / 1024) + " KB)…");
  await ghPut(repoPath(name), btoa(bin), "admin: upload " + safe);
  logLine("uploaded " + name);
  return name;
}

async function publish() {
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    alert("Fill in owner, repository and token on the Publish tab first.");
    document.querySelector('[data-tab="publish"]').click();
    return;
  }
  try {
    setStatus("publishing…");
    logLine("checking the copy on GitHub…");
    const remote = await ghGet(repoPath("content.json"));
    if (remote && remote.sha && loadedSha && remote.sha !== loadedSha) {
      if (!confirm("content.json on GitHub has changed since this panel loaded it.\n\nPublishing will overwrite that version with your local draft. Continue?")) {
        setStatus("publish cancelled"); logLine("cancelled by user."); return;
      }
    }
    logLine("committing content.json…");
    await ghPut(repoPath("content.json"), b64(JSON.stringify(C, null, 2)), "admin: update content");
    for (const p of C.projects) {
      if (!p.slug) continue;
      logLine("writing " + p.slug + "/index.html …");
      await ghPut(repoPath(p.slug + "/index.html"), b64(projectStub(p)), "admin: page for " + p.slug);
    }
    const after = await ghGet(repoPath("content.json"));
    loadedSha = after && after.sha;
    logLine("done — GitHub Pages usually rebuilds within a minute.");
    setStatus("published");
    localStorage.removeItem(LS.draft);
  } catch (e) {
    const net = /failed to fetch|networkerror|load failed/i.test(e.message);
    const msg = net
      ? "Could not reach the GitHub API.\n\nCheck: you are online, the token has not expired, and no ad-blocker or VPN is blocking api.github.com. Your draft is safe — press Publish again, or use Download content.json."
      : e.message;
    logLine("ERROR " + e.message);
    setStatus("publish failed");
    alert("Publish failed:\n" + msg);
  }
}

async function testConnection() {
  const l = document.getElementById("log");
  if (l) l.textContent = "Running checks…";
  const step = async (name, fn) => {
    try { const out = await fn(); logLine("OK   " + name + (out ? " — " + out : "")); return true; }
    catch (e) { logLine("FAIL " + name + " — " + e.message); return false; }
  };

  if (!await step("reach api.github.com", async () => {
    const r = await fetch("https://api.github.com/rate_limit", { cache: "no-store" });
    if (!r.ok) throw new Error("status " + r.status);
    return "reachable";
  })) {
    logLine("");
    logLine("The browser could not reach GitHub at all. Almost always one of:");
    logLine("  · an ad-blocker, privacy extension or VPN blocking api.github.com");
    logLine("  · a corporate or campus network blocking it");
    logLine("  · you are offline");
    logLine("Try an incognito window with extensions disabled, or a different network.");
    logLine("Meanwhile: use Download content.json and upload that file to GitHub by hand.");
    return;
  }

  if (!cfg.token) { logLine("FAIL token — the field is empty"); return; }
  if (!await step("token is valid", async () => {
    const r = await fetch("https://api.github.com/user", {
      cache: "no-store",
      headers: { Authorization: "Bearer " + cfg.token, Accept: "application/vnd.github+json" }
    });
    if (r.status === 401) throw new Error("401 — token is wrong, revoked or expired");
    if (!r.ok) throw new Error("status " + r.status);
    const j = await r.json();
    return "signed in as " + j.login;
  })) return;

  if (!await step("repository is reachable with this token", async () => {
    const r = await fetch("https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo, {
      cache: "no-store",
      headers: { Authorization: "Bearer " + cfg.token, Accept: "application/vnd.github+json" }
    });
    if (r.status === 404) throw new Error("404 — check owner and repository spelling, and that the token grants access to this repo");
    if (!r.ok) throw new Error("status " + r.status);
    const j = await r.json();
    return j.full_name + " (default branch: " + j.default_branch + ")";
  })) return;

  await step("write permission", async () => {
    const r = await fetch("https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo, {
      cache: "no-store",
      headers: { Authorization: "Bearer " + cfg.token, Accept: "application/vnd.github+json" }
    });
    const j = await r.json();
    if (!j.permissions || !j.permissions.push) throw new Error("token lacks Contents: read and write on this repo");
    return "can write";
  });

  await step("find " + repoPath("content.json"), async () => {
    const f = await ghGet(repoPath("content.json"));
    if (!f) throw new Error("not found on branch " + cfg.branch + " — publishing would create it here. If that is not where your site reads it from, fix the Folder field.");
    return "found, " + Math.round(f.size / 1024) + " KB";
  });
  logLine("");
  logLine("Checks complete.");
}

/* ---------- SHARE / QR ---------- */
function siteUrl() {
  if (cfg.siteUrl) return cfg.siteUrl.replace(/\/index\.html$/i, "").replace(/\/$/, "") + "/";
  return location.href.replace(/admin\.html.*$/i, "");
}
function share() {
  const root = document.getElementById("p-share");
  if (!root) return;
  root.innerHTML = '<p class="hint">A recruiter scans this with their phone camera and lands on your portfolio. Print it on a business card, put it on the last slide of a deck, or keep it on your phone to show in person.</p>';
  root.appendChild(field("Portfolio URL", cfg.siteUrl || siteUrl(), v => { cfg.siteUrl = v.trim(); saveCfg(); share(); }, "url"));

  const url = siteUrl();
  const block = document.createElement("div");
  block.className = "qr-block";
  block.style.cssText = "display:flex;gap:24px;align-items:flex-start;margin-top:18px;flex-wrap:wrap";
  const sizes = [{ px: 320, label: "Screen / slide" }, { px: 900, label: "Print (business card, poster)" }];
  const src = px => "https://api.qrserver.com/v1/create-qr-code/?size=" + px + "x" + px + "&margin=12&ecc=M&data=" + encodeURIComponent(url);
  sizes.forEach(s => {
    const w = document.createElement("div");
    w.style.cssText = "text-align:center";
    w.innerHTML = '<img src="' + src(s.px) + '" alt="QR code" style="width:190px;height:190px;background:#fff;border:1px solid rgba(47,93,87,.3);border-radius:4px;padding:8px">' +
      '<p class="hint" style="margin-top:6px">' + esc(s.label) + '<br>' + s.px + '×' + s.px + '</p>';
    const dl = document.createElement("a");
    dl.className = "btn small"; dl.textContent = "Download PNG";
    dl.href = src(s.px); dl.target = "_blank"; dl.rel = "noopener";
    dl.style.display = "inline-block"; dl.style.marginTop = "6px";
    w.appendChild(dl);
    block.appendChild(w);
  });
  root.appendChild(block);
  root.insertAdjacentHTML("beforeend", '<p class="hint" style="margin-top:16px">Pointing at: <code>' + esc(url) + '</code></p>' +
    '<p class="warn" style="margin-top:12px">The QR images come from a free QR service, so you need to be online to see or download them. Once downloaded, the PNG works forever — the code is just your URL.</p>');
  const test = document.createElement("a");
  test.className = "btn small"; test.textContent = "Open the URL to check it";
  test.href = url; test.target = "_blank"; test.rel = "noopener";
  root.appendChild(test);
}

function projectStub(p) {
  const t = (p.title || "Project") + " — " + (C.meta.name || "");
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + esc(t) + '</title>\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Playfair+Display:wght@400;600&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">\n' +
    '<link rel="stylesheet" href="../style.css?v=' + Date.now().toString(36) + '">\n</head>\n<body>\n<div class="progress"></div>\n<div id="root"></div>\n' +
    '<script>window.PF_BASE="../";window.PF_SLUG=' + JSON.stringify(p.slug) + ';<\/script>\n' +
    '<script src="../render.js?v=' + Date.now().toString(36) + '"><\/script>\n<script>\n' +
    'Portfolio.loadContent().then(c => Portfolio.renderProject(c, document.getElementById("root")))\n' +
    '  .catch(e => { document.getElementById("root").innerHTML = "<p style=\'padding:40px\'>" + e.message + "</p>"; });\n' +
    '<\/script>\n</body>\n</html>\n';
}

function preview() {
  localStorage.setItem("pf_preview", JSON.stringify(C));
  window.open("index.html?preview=1", "_blank");
}
