/* Portfolio renderer — reads content.json and paints the pages.
   No build step, no framework. Works on GitHub Pages as-is. */

const FONT_STACK = {
  "Cormorant Garamond": "'Cormorant Garamond', Georgia, serif",
  "Playfair Display": "'Playfair Display', Georgia, serif",
  "EB Garamond": "'EB Garamond', Georgia, serif",
  "Libre Baskerville": "'Libre Baskerville', Georgia, serif",
  "Lora": "'Lora', Georgia, serif",
  "Source Serif 4": "'Source Serif 4', Georgia, serif"
};

function darken(hex, f) {
  const m = /^#([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return "#142823";
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v * f));
  return "#" + ch.map(v => v.toString(16).padStart(2, "0")).join("");
}
function alpha(hex, a) {
  const m = /^#([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return `rgba(32,31,29,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const B = () => (window.PF_BASE || "");
const asset = u => (!u || /^(https?:|data:|mailto:|\/)/i.test(u)) ? u : B() + u;
const projHref = slug => B() + encodeURIComponent(slug) + "/";

const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function applyTheme(t) {
  const heading = FONT_STACK[t.headingFont] || FONT_STACK["Cormorant Garamond"];
  const body = FONT_STACK[t.bodyFont] || FONT_STACK["Lora"];
  const r = document.documentElement.style;
  r.setProperty("--band", t.band);
  r.setProperty("--brand", t.brandColor || t.bg);
  r.setProperty("--band-dark", darken(t.band, 0.42));
  r.setProperty("--accent", t.accent);
  r.setProperty("--accent-soft", alpha(t.accent, 0.07));
  r.setProperty("--bg", t.bg);
  r.setProperty("--ink", t.ink);
  r.setProperty("--ink-60", alpha(t.ink, 0.6));
  r.setProperty("--ink-70", alpha(t.ink, 0.72));
  r.setProperty("--rule", alpha(t.band, 0.26));
  r.setProperty("--paper-70", alpha(t.bg, 0.75));
  r.setProperty("--paper-16", alpha(t.bg, 0.16));
  r.setProperty("--fh", heading);
  r.setProperty("--fb", body);
  r.setProperty("--base", (t.baseSize || 16) + "px");
  r.setProperty("--gap", (t.sectionSpacing || 88) + "px");
  document.body.classList.toggle("no-anim", t.animations === false);
}

/* ---------- section renderers ---------- */

const NAV_DEFAULT = { experience: "Work experience", education: "Education", projects: "Projects", contact: "Contact" };

function navLinks(c, current) {
  return c.sections
    .filter(s => s.enabled !== false && (s.navShow != null ? s.navShow : NAV_DEFAULT[s.type] != null))
    .map(s => {
      const label = s.navLabel || NAV_DEFAULT[s.type] || s.title || s.id;
      const onProjects = current === "projects" && s.type === "projects";
      const href = s.type === "projects" ? B() + "projects.html" : (current === "home" ? "#" + s.id : B() + "index.html#" + s.id);
      return "<a class=\"pill" + (onProjects ? " here" : "") + "\" href=\"" + esc(href) + "\">" + esc(label) + "</a>";
    }).join("");
}

function hero(s, c) {
  const t = c.theme, m = c.meta;
  const photo = t.showPhoto !== false
    ? `<figure class="hero-plate">
         ${m.photo ? `<img src="${esc(asset(m.photo))}" alt="${esc(m.name)}">` : `<div class="plate-empty">Add a photograph in the admin panel</div>`}
         <figcaption>${esc(m.photoCaption || "")}</figcaption>
       </figure>` : "";
  return `<header id="top" class="band">
    <div class="wrap nav">
      <a class="brand" href="${B()}index.html">${esc(m.name)}</a>
      ${navLinks(c, "home")}
    </div>
    <div class="wrap hero${t.showPhoto === false ? " nophoto" : ""}">
      <div>
        <p class="kicker on-band">${esc(s.kicker)}</p>
        <h1>${esc(s.headline)}</h1>
        <div class="rule-in"></div>
        <p class="lede">${esc(s.body)}</p>
      </div>
      ${photo}
    </div>
  </header>`;
}

function journey(s) {
  return sectionShell(s, `<div class="rail">
    <div class="rail-line"></div>
    ${s.items.map(i => `<div class="rail-item reveal">
      <span class="dot"></span>
      <p class="year">${esc(i.year)}</p>
      <h3>${esc(i.title)}</h3>
      <p class="note">${esc(i.note)}</p>
    </div>`).join("")}
  </div>`);
}

function experience(s) {
  return sectionShell(s, s.items.map((i, n) => `<div class="exp reveal${n ? " topline" : ""}">
    <div>
      <h3>${esc(i.org)} ${i.orgNote ? `<span class="muted">${esc(i.orgNote)}</span>` : ""}</h3>
      <p class="role">${esc(i.role)}</p>
      <p class="period">${esc(i.period)}</p>
      <p class="note">${esc(i.summary)}</p>
    </div>
    <ul>${i.bullets.map(b => `<li><span class="dash">—</span><span>${esc(b)}</span></li>`).join("")}</ul>
  </div>`).join(""));
}

function projectRows(s, c) {
  return sectionShell(s, `<div class="rows">${c.projects.map(p => `<a class="row reveal" href="${projHref(p.slug)}">
    <span class="num">${esc(p.num)}</span>
    <div>
      <h3>${esc(p.title)}</h3>
      <p class="period">${esc(p.org)} · ${esc(p.period)} · ${esc(p.role)}</p>
      <p class="note">${esc(p.summary)}</p>
    </div>
    <span class="arrow">→</span>
  </a>`).join("")}</div>
  <a class="btn-band" href="${B()}projects.html">All projects with full detail →</a>`);
}

function practice(s) {
  return sectionShell(s, `<div class="two">
    <p class="lede-dark reveal">${esc(s.body)}</p>
    <div class="stack">${s.items.map(i => `<div class="edged reveal"><h3>${esc(i.title)}</h3><p class="note">${esc(i.note)}</p></div>`).join("")}</div>
  </div>`, true);
}

function education(s) {
  return sectionShell(s, `<div class="table">${s.items.map(i => `<div class="edu reveal">
    <p class="year">${esc(i.year)}</p>
    <p class="degree">${esc(i.degree)}</p>
    <p class="inst">${esc(i.institute)}</p>
    <p class="note">${esc(i.note)}</p>
  </div>`).join("")}</div>`);
}

function skills(s) {
  return sectionShell(s, `<div class="grid3">${s.items.map(i => `<div class="skill reveal"><h3>${esc(i.title)}</h3><p class="note">${esc(i.note)}</p></div>`).join("")}</div>`);
}

function certifications(s) {
  return sectionShell(s, `<div class="table">${s.items.map(i => `<div class="cert reveal"><p class="ct">${esc(i.title)}</p><p class="note">${esc(i.meta)}</p></div>`).join("")}</div>`);
}

function textSection(s) {
  return sectionShell(s, `<p class="lede-dark reveal">${esc(s.body || "")}</p>`);
}

function contact(s, c) {
  const m = c.meta;
  return `<section id="contact" class="band contact">
    <div class="wrap">
      <div>
        <p class="kicker on-band">${esc(s.kicker || "Contact")}</p>
        <h2>${esc(s.title)}</h2>
        <p class="lede">${esc(m.location)}</p>
      </div>
      <div class="cta">
        ${m.email ? `<a class="btn-gold" href="mailto:${esc(m.email)}?subject=${encodeURIComponent("Portfolio enquiry")}">Email me</a>` : ""}
        ${m.resumeUrl ? `<a class="btn-outline" href="${esc(asset(m.resumeUrl))}" download="${esc(m.resumeName || "Resume.pdf")}">Resume</a>` : ""}
        ${m.linkedin ? `<a class="link-quiet" href="${esc(m.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : ""}
      </div>
    </div>
  </section>`;
}

function sectionShell(s, inner, noRule) {
  return `<section id="${esc(s.id)}" class="sec${noRule ? " norule" : ""}">
    <div class="wrap">
      <div class="sec-head">
        ${s.kicker ? `<p class="kicker reveal">${esc(s.kicker)}</p>` : ""}
        ${s.title ? `<h2 class="reveal">${esc(s.title)}</h2>` : ""}
      </div>
      ${inner}
    </div>
  </section>`;
}

const RENDERERS = { hero, journey, experience, projects: projectRows, practice, education, skills, certifications, text: textSection, contact };

/* ---------- page painters ---------- */

async function loadContent() {
  if (new URLSearchParams(location.search).get("preview") === "1") {
    const p = localStorage.getItem("pf_preview");
    if (p) return JSON.parse(p);
  }
  const res = await fetch(B() + "content.json?ts=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("content.json not found");
  return res.json();
}

function renderHome(c, root) {
  applyTheme(c.theme);
  root.innerHTML = c.sections.filter(s => s.enabled !== false)
    .map(s => (RENDERERS[s.type] || (() => ""))(s, c)).join("");
  wireReveals(c.theme);
}

function renderProjectIndex(c, root) {
  applyTheme(c.theme);
  const m = c.meta;
  root.innerHTML = `<header id="top" class="band">
    <div class="wrap nav">
      <a class="brand" href="${B()}index.html">${esc(m.name)}</a>
      ${navLinks(c, "projects")}
    </div>
    <div class="wrap page-head">
      <p class="kicker on-band">${c.projects.length} projects, one page each</p>
      <h1>The work, at the length it deserves.</h1>
      <div class="rule-in"></div>
      <p class="lede">Each project has its own page: the deck you can click through, the objective, what I did, the result, and the documents and code behind it.</p>
    </div>
  </header>
  <section class="sec norule"><div class="wrap"><div class="cards">
    ${c.projects.map(p => `<a class="card reveal" href="${projHref(p.slug)}">
      <span class="num">${esc(p.num)}</span>
      <div>
        <h2>${esc(p.title)}</h2>
        <p class="period">${esc(p.org)} · ${esc(p.period)} · ${esc(p.role)}</p>
        <p class="note">${esc(p.summary)}</p>
      </div>
      <div class="cover">${p.cover ? `<img src="${esc(asset(p.cover))}" alt="">` : `<div class="plate-empty small">Cover image</div>`}</div>
    </a>`).join("")}
  </div></div></section>
  ${c.extras && c.extras.length ? `<section class="sec"><div class="wrap">
    <div class="sec-head"><h2 class="reveal">Also worth mentioning</h2></div>
    <div class="two-even">${c.extras.map(x => `<div class="edged-top reveal"><h3>${esc(x.title)}</h3><p class="note">${esc(x.note)}</p></div>`).join("")}</div>
  </div></section>` : ""}
  ${contact(c.sections.find(s => s.type === "contact") || { title: "Happy to walk through any of these in more detail." }, c)}`;
  wireReveals(c.theme);
}

function renderProject(c, root) {
  applyTheme(c.theme);
  const slug = window.PF_SLUG || new URLSearchParams(location.search).get("p");
  const p = c.projects.find(x => x.slug === slug) || c.projects[0];
  if (!p) { root.innerHTML = "<p style='padding:40px'>No projects yet.</p>"; return; }
  const idx = c.projects.indexOf(p);
  const next = c.projects[idx + 1];
  document.title = p.title + " — " + c.meta.name;
  root.innerHTML = `<header id="top" class="band">
    <div class="wrap nav">
      <a class="brand" href="${B()}index.html">${esc(c.meta.name)}</a>
      ${navLinks(c, "project")}
    </div>
    <div class="wrap page-head">
      <p class="kicker on-band">Project ${esc(p.num)} · ${esc(p.org)} · ${esc(p.period)}</p>
      <h1>${esc(p.title)}</h1>
      <div class="rule-in"></div>
      <p class="lede">${esc(p.intro)}</p>
      <div class="stats">${(p.stats || []).map(s => `<div><p class="sv">${esc(s.value)}</p><p class="sl">${esc(s.label)}</p></div>`).join("")}</div>
    </div>
  </header>
  ${(p.slides && p.slides.length) ? `<section class="sec norule"><div class="wrap">
    <div class="deck-head">
      <div><p class="kicker">The deck</p><h2>Walkthrough, <span id="slideLabel"></span></h2></div>
      <div class="deck-nav"><button id="prev" aria-label="Previous slide">←</button><button id="next" aria-label="Next slide">→</button></div>
    </div>
    <div class="deck" id="deck">
      ${p.slides.map((src, i) => `<img src="${esc(asset(src))}" alt="Slide ${i + 1}" class="slide${i ? "" : " on"}">`).join("")}
      <button class="edge left" id="edgeL" aria-label="Previous slide"></button>
      <button class="edge right" id="edgeR" aria-label="Next slide"></button>
    </div>
    <div class="deck-foot"><p class="note">Click the left or right edge of the slide, or use the arrow keys.</p><div class="dots" id="dots"></div></div>
  </div></section>` : ""}
  <section class="sec"><div class="wrap">
    <div class="detail">
      <h3 class="dl reveal">Objective</h3><p class="dt reveal">${esc(p.objective)}</p>
      <h3 class="dl reveal">What I did</h3><div class="dt reveal">${(p.did || []).map(d => `<p>${esc(d)}</p>`).join("")}</div>
      <h3 class="dl reveal">Result</h3><div class="dt reveal">
        <div class="res">${(p.stats || []).slice(0, 2).map(s => `<div><p class="rv">${esc(s.value)}</p><p class="note">${esc(s.label)}</p></div>`).join("")}</div>
        <p>${esc(p.resultText)}</p>
      </div>
      <h3 class="dl reveal">Conclusion</h3><p class="dt reveal">${esc(p.conclusion)}</p>
    </div>
  </div></section>
  <section class="sec"><div class="wrap"><div class="files">
    ${(p.downloads || []).filter(d => d.label).map(d => `<a class="file reveal" href="${esc(asset(d.url) || "#")}"${d.url ? ` download="${esc(d.fileName || d.label || "download")}"` : ""}>
      <span class="kicker">Download</span><span class="ft">${esc(d.label)}</span><span class="note">${esc(d.note)}${d.url ? "" : " · add the file in the admin panel"}</span></a>`).join("")}
    ${p.code && p.code.url ? `<a class="file reveal" href="${esc(p.code.url)}" target="_blank" rel="noopener">
      <span class="kicker">View code</span><span class="ft">${esc(p.code.label || "Repository")}</span><span class="note">${esc(p.code.note || "GitHub")}</span></a>` : ""}
  </div></div></section>
  <section class="band contact">
    <div class="wrap">
      <h2>${next ? "Next: " + esc(next.title) + "." : "Happy to talk through any of it."}</h2>
      <div class="cta row-cta">
        <a class="btn-gold" href="${next ? projHref(next.slug) : "mailto:" + esc(c.meta.email) + "?subject=" + encodeURIComponent("Portfolio enquiry")}">${next ? "Project " + esc(next.num) + " →" : "Get in touch"}</a>
        <a class="btn-outline" href="${B()}projects.html">All projects</a>
      </div>
    </div>
  </section>`;
  wireReveals(c.theme);
  if (p.slides && p.slides.length) wireDeck(p.slides.length);
}

function wireDeck(n) {
  let i = 0;
  const slides = [...document.querySelectorAll(".slide")];
  const dots = document.getElementById("dots");
  const label = document.getElementById("slideLabel");
  dots.innerHTML = slides.map((_, k) => `<button data-k="${k}" aria-label="Slide ${k + 1}"></button>`).join("");
  const paint = () => {
    slides.forEach((s, k) => s.classList.toggle("on", k === i));
    [...dots.children].forEach((d, k) => d.classList.toggle("on", k === i));
    label.textContent = `slide ${i + 1} of ${n}`;
  };
  const move = d => { i = (i + d + n) % n; paint(); };
  document.getElementById("prev").onclick = () => move(-1);
  document.getElementById("next").onclick = () => move(1);
  document.getElementById("edgeL").onclick = () => move(-1);
  document.getElementById("edgeR").onclick = () => move(1);
  dots.onclick = e => { const k = e.target.dataset.k; if (k != null) { i = +k; paint(); } };
  window.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") move(1);
    if (e.key === "ArrowLeft") move(-1);
  });
  paint();
}

function wireReveals(theme) {
  const bar = document.querySelector(".progress");
  if (bar) {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
  if (theme && theme.animations === false) {
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("in"));
    document.querySelectorAll(".sec").forEach(el => el.classList.add("lit"));
    return;
  }
  const io = new IntersectionObserver(es => {
    es.forEach((e, k) => {
      if (!e.isIntersecting) return;
      e.target.style.transitionDelay = (k * 70) + "ms";
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));
  const lit = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("lit"); lit.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll(".sec").forEach(el => lit.observe(el));
}

window.Portfolio = { loadContent, renderHome, renderProjectIndex, renderProject, applyTheme, FONT_STACK };
