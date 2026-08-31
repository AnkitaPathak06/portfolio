# Portfolio — static site + admin panel

A plain HTML/CSS/JS site. No build step, no framework. All text, projects, images and
appearance settings live in **`content.json`**, which the admin panel edits and commits
to GitHub for you.

```
index.html      home page
projects.html   list of projects
project.html    one project, read as project.html?p=slug
admin.html      the admin panel  (passcode-gated)
admin.js        panel logic + GitHub publishing
render.js       paints the pages from content.json
style.css       all styling, driven by CSS variables the theme sets
content.json    ← everything you edit
assets/         images, decks and documents uploaded through the panel
```

---

## 1. Put it on GitHub

**If you want it at `ankitapathak06.github.io/portfolio/`** (replacing your current site):

1. Go to your existing `portfolio` repository on GitHub.
2. Move your current files into a folder called `old/` if you want to keep them
   (Add file → or just delete them — the repo history keeps everything either way).
3. Click **Add file → Upload files**, drag in every file from this `site/` folder —
   `index.html`, `projects.html`, `project.html`, `admin.html`, `admin.js`,
   `render.js`, `style.css`, `content.json` — and commit.
4. **Settings → Pages**. Source: *Deploy from a branch*. Branch: `main`, folder: `/ (root)`. Save.
5. Wait about a minute, then open `https://ankitapathak06.github.io/portfolio/`.

**If you'd rather start a clean repository:** create a new repo named `portfolio-v2`,
upload the same files, enable Pages the same way. The URL becomes
`https://ankitapathak06.github.io/portfolio-v2/`.

Keeping the files at the repo root is the simplest setup. If you put them in a
subfolder instead, set that folder name in the panel's **Publish → Folder in repo** field.

---

## 2. Create the token the admin panel uses

The panel saves by committing to your repo through the GitHub API, so it needs a token.

1. GitHub → your avatar → **Settings** → **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Name it `portfolio-admin`. Expiration: 90 days (you'll renew it; that's the point).
3. **Repository access** → *Only select repositories* → pick `portfolio`.
4. **Permissions** → *Repository permissions* → **Contents: Read and write**.
   Nothing else is needed.
5. Generate, then copy the token — GitHub shows it once.

---

## 3. Use the admin panel

1. Open `https://ankitapathak06.github.io/portfolio/admin.html`.
2. Passcode: **`portfolio`** — change it on line 4 of `admin.js` before you upload,
   or any time after.
3. Go to the **Publish** tab and fill in:
   - Owner: `ankitapathak06`
   - Repository: `portfolio`
   - Branch: `main`
   - Folder: leave blank if the files are at the repo root
   - Token: paste it. It is stored in your browser only and never committed.
4. Edit anything:
   - **Sections** — add, delete, hide, reorder any section; edit every line of copy,
     every journey entry, role, bullet, education row, skill and certificate.
   - **Projects** — add or delete projects, edit objective / what I did / result /
     conclusion, upload deck slides (they become the click-through viewer), attach
     downloadable documents, set the code link.
   - **Appearance** — band colour, accent, background, heading and body fonts,
     text size, section spacing, animations on/off, photo on/off.
   - **Details** — name, email, LinkedIn, location, résumé file, photograph.
5. Every change saves to your browser immediately. **Preview site** opens the real
   pages using your unsaved draft.
6. **Publish to GitHub** commits `content.json`. The live site updates in about a minute.

Images and documents you upload are committed to `assets/` right away, so they exist
before the content that points at them.

---

## URLs

- Home: `https://ankitapathak06.github.io/portfolio/` — no `index.html` needed, GitHub serves it automatically.
- Projects list: `.../portfolio/projects.html`
- A project: `.../portfolio/allocation-app/` — one folder per project, named after its slug.

The admin panel writes those project folders for you every time you publish, so a new
project or a renamed slug gets its own clean URL. `project.html?p=slug` still works as
a fallback.

## QR code for recruiters

**Share / QR** tab in the admin panel. It shows your live URL as a QR code in two sizes —
one for slides, one for print — with a download button for each. Any phone camera reads it.

## Publishing an update (the short version)

1. Open your `portfolio` repo on GitHub.
2. **Add file → Upload files**, drag in the whole unzipped folder, **Commit changes**.
   Uploading a file that already exists replaces it.
3. Wait ~1 minute for Pages to rebuild, then reload your site. The CSS and JS carry a
   version stamp, so you do not need to clear any cache.
4. Open `admin.html` → **Publish** tab → **Discard local draft** once, so the panel
   picks up the new `content.json` (section order changed). Your token stays saved.

## Honest limits

- **The passcode is a speed bump, not security.** Anyone can read `admin.js` in a
  public repo and see it. It stops casual visitors, nothing more. The thing that
  actually protects your site is the token, which lives only in your browser.
- **Never commit the token.** The panel doesn't, and you shouldn't paste it into any
  file. If you think it leaked, revoke it on GitHub and generate a new one.
- If you prefer no token at all, use **Download content.json** in the Publish tab and
  upload that file to GitHub yourself — same result, one more step.
- Uploading very large files (over ~5 MB) through the GitHub API can fail. Export
  slides as JPEGs around 1600px wide.
- To edit from a phone, the panel works, but reordering with ↑ ↓ is easier on a laptop.

---

## Editing without the panel

`content.json` is plain JSON — you can edit it directly on GitHub (click the file,
then the pencil icon) and commit. Same effect. Keep the structure intact: each
section needs `id`, `type` and `enabled`.
