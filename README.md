# Actionables — hosting on GitHub Pages

This folder is the Actionables app packaged for **GitHub Pages**. It's the same app as
everywhere else — a self-contained static site (all libraries bundled, no build step).
The files sit at the **repo root** so GitHub can serve them with no configuration.

Published URL looks like:

    https://<your-username>.github.io/<repo-name>/

---

## What actually gets deployed

Just the web files in this folder:

    index.html  styles.css  app.js  seed.js  sync.js  firebase-config.js  vendor/  .nojekyll

You do **not** need any CI file. (If you also looked at the GitLab package, note its
`.gitlab-ci.yml` is GitLab-only and is not used here.) `.nojekyll` tells GitHub to serve
the files as-is instead of running them through Jekyll.

---

## ⚠️ Important: GitHub Pages sites are public

On GitHub Free (and Pro), a published Pages site is **reachable by anyone with the URL** —
GitHub does **not** offer private/login-gated Pages except on Enterprise. This is the one
real difference from GitLab (where a free private project can gate its Pages behind login).

Because of that, this GitHub copy **ships with an empty dataset** — none of your BCP /
ICICI / SCB data is in the source or the live page. You bring your data in safely one of
two ways:

- **Firebase sync (recommended):** turn on sync (see `FIREBASE-SYNC.md`). Your data lives
  in Firestore, protected by a login and security rules — it is *not* exposed by the public
  site. Sign in and your data appears. If you use the **same Firebase project** you set up
  for the GitLab version, the data simply syncs to both.
- **Import a backup:** Settings → Import backup, and select a JSON you exported elsewhere.
  (This stays in that browser only unless sync is on.)

Do **not** paste your real client data into `seed.js` here unless you're fine with it being
publicly visible.

---

## Option A — Publish with the GitHub web UI (no tools)

1. Sign in at https://github.com → **New repository**. Name it e.g. `actionables`.
   Public is fine (the site is public regardless). **Create repository**.
2. On the repo page: **Add file → Upload files**. Drag in everything from this folder,
   keeping the `vendor/` folder together, plus the hidden `.nojekyll` (if your file
   picker hides it, you can add it later via **Add file → Create new file**, name it
   `.nojekyll`, leave it empty, commit).
3. **Commit changes.**
4. Go to **Settings → Pages**. Under **Build and deployment → Source**, choose
   **Deploy from a branch**. Set **Branch = main**, **Folder = / (root)**. **Save**.
5. Wait ~1 minute, refresh the Pages settings page — it shows **"Your site is live at …"**.
   Open that URL.

## Option B — Publish with git (fastest)

From inside this folder:

```bash
git init
git add -A            # -A includes the hidden .nojekyll
git commit -m "Actionables web app"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then do step 4–5 from Option A (Settings → Pages → Deploy from branch → main → /root).

---

## Updating later

Change a file, then re-upload it (Option A) or:

```bash
git add -A && git commit -m "update" && git push
```

Pages rebuilds automatically within a minute.

## Custom domain (optional)

**Settings → Pages → Custom domain** lets you point e.g. `actionables.yourdomain.com`
at the site (add the DNS records GitHub shows, and a `CNAME` file is created for you).

---

## Files

    index.html          app shell
    styles.css          styles + themes (dark/light, accents, fonts)
    app.js              all app logic
    seed.js             EMPTY starting data (safe for a public site)
    sync.js             optional Firebase sync (inactive until configured)
    firebase-config.js  paste your Firebase config here to enable sync
    vendor/             bundled libraries (xlsx, jsPDF) for Excel/PDF export
    .nojekyll           serve files as-is (no Jekyll)
    FIREBASE-SYNC.md    how to turn on realtime cross-device sync
