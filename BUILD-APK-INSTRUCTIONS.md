# How to Get Your APK — Two Ready-to-Go Paths

Everything is pre-configured. You do **not** need to write any code.
Pick whichever path is easier for you.

---

## Path A (Easiest, no installs) — Let GitHub build it for you

This uses the `.github/workflows/build-apk.yml` file already included here.
GitHub's own servers compile the APK — you never touch Android Studio.

1. Go to https://github.com → **New repository** (name it e.g. `actionables-app`).
   Public or private both work.
2. Upload **everything in this folder** (keep the folder structure intact —
   especially the hidden `.github` folder).
   - If your browser upload hides `.github`, use these commands instead from
     inside this folder:
     ```
     git init
     git add -A
     git commit -m "Actionables Android project"
     git branch -M main
     git remote add origin https://github.com/<you>/actionables-app.git
     git push -u origin main
     ```
3. On GitHub, click the **Actions** tab of your new repo.
   You'll see a workflow run start automatically ("Build Android APK").
4. Wait 3–5 minutes for it to finish (green check ✅).
5. Click into the finished run → scroll to **Artifacts** →
   download **actionables-debug-apk.zip**.
6. Unzip it — inside is `app-debug.apk`. That's your installable app.

**To install on your phone:** transfer the APK to your Android phone (e.g. via
email, Google Drive, or USB), tap it, and allow "install from unknown sources"
if prompted.

---

## Path B — Build locally in Android Studio

Use this if you want to test on an emulator, change the icon, or eventually
publish to the Play Store (which needs a signed release build, not just debug).

### One-time setup
1. Install **Node.js** (v18+): https://nodejs.org
2. Install **Android Studio**: https://developer.android.com/studio
   (this bundles the Android SDK and Java you need)

### Steps
```bash
# From inside this folder:
npm install
npx cap sync android
npx cap open android
```

This last command opens the `android/` folder in Android Studio.

In Android Studio:
1. Let it finish "Gradle sync" (progress bar at the bottom) — first time
   takes a few minutes as it downloads dependencies.
2. Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. When it finishes, click the **locate** link in the notification, or find
   the file at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

---

## What's Already Configured For You

- ✅ App ID: `com.fable.actionables`
- ✅ App name: `Actionables`
- ✅ Internet permission (needed for Firebase sync)
- ✅ Storage permissions (needed for the Excel/PDF export features)
- ✅ All your web files (`index.html`, `app.js`, `styles.css`, `vendor/`,
  Firebase files) copied into the `www/` folder Capacitor uses
- ✅ GitHub Actions workflow that builds automatically on every push

## Before You Publish or Share Widely

- **Fill in `firebase-config.js`** with your real Firebase project credentials
  if you haven't already — otherwise sync won't work inside the app.
- This build is a **debug APK** — fine for personal use and testing. For the
  Play Store, you'd need a **signed release build** (a keystore file + a
  different Gradle task, `assembleRelease`). Ask me if you want that set up too.
- Test the export-to-Excel/PDF features on a real device — emulator storage
  behavior can differ from real phones.

---

## If the GitHub Actions Build Fails

Click into the red ❌ run → open the "Build debug APK" step → read the error.
Common causes:
- `firebase-config.js` left as a placeholder with invalid syntax
- A typo introduced while uploading files manually (prefer the `git push`
  method above — it's less error-prone than drag-and-drop)

Paste me the error text and I'll fix it.
