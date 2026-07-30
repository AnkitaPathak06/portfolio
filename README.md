# Portfolio — Ankita Pathak

Every file sits at the top level. There are no folders, deliberately: GitHub's
web uploader flattens folders, so a flat project is one that always uploads
correctly.

| File | What it is |
|---|---|
| `index.html` | your site |
| `projects.html` | all projects, filterable |
| `project.html` | project detail template (`project.html?slug=…`) |
| `admin.html` | the content editor |
| `content.json` | all your content |
| `site.css` / `site.js` | styles and rendering for the public pages |
| `admin.css` / `admin.js` | styles and logic for the editor |
| `profile.jpg` | your photo |
| `preview.html` | standalone local preview, safe to delete |

## Addresses

- Site: `https://ankitapathak06.github.io/ankitapathak/`
- Editor: `https://ankitapathak06.github.io/ankitapathak/admin.html`

## Editing content

Open `admin.html`, enter username `AnkitaPathak06`, repository `ankitapathak`,
branch `main`, and a fine-grained token with **Contents: Read and write** on this
repository. Edit, then click **Publish** — the live site updates in about a
minute.

The token is held in the browser tab only and is never committed.

## The contact form

By default the form opens the visitor's email app with the message filled in —
no setup needed. To receive messages in your inbox instead, make a form at
formspree.io, copy its endpoint, and paste it into the editor under
**Contact → Form endpoint**.

## Notes

- Images uploaded through the editor go into an `images` folder, created
  automatically. That folder is made by the GitHub API, not by uploading, so it
  cannot get flattened.
- Project pages accept Markdown: `##` heading, `-` bullet, `**bold**`,
  `[text](url)`, `![alt](image.jpg)`.
- Colours and fonts are variables at the top of `site.css`.
- Animations respect the reduce-motion setting.
