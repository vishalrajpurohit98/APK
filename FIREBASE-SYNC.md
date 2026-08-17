# Turning on cross-device sync (Firebase)

By default the app is **local only** — data lives in each browser. Do this once to make
your changes sync across every browser and device in realtime (works the same whether the
site is hosted on GitHub Pages, GitLab Pages, or anywhere else). Free tier is plenty.

On a **public** GitHub Pages site this is also how you keep data private: Firestore is
gated by your login and security rules, so your data is never exposed by the public page.

The app keeps working **offline** even with sync on: Firestore caches locally and
uploads your changes when the connection returns.

---

## 1. Create a Firebase project (~2 min)

1. Go to https://console.firebase.google.com and click **Add project**.
   Give it a name (e.g. `actionables`), accept defaults, create it.
2. In the project, click the **`</>`** (Web) icon — "Add app to get started".
   Give it a nickname, **do not** enable Hosting, click **Register app**.
3. Firebase shows a `firebaseConfig = { ... }` snippet. Keep this tab open — you'll copy
   `apiKey`, `authDomain`, `projectId`, and `appId` from it in step 3.

## 2. Enable Email/Password sign-in and Firestore

**Authentication:**
- Left menu → **Build → Authentication → Get started**.
- **Sign-in method** tab → enable **Email/Password** → Save.
- **Settings** tab → **Authorized domains** → **Add domain** → enter your Pages
  domain `<your-username>.github.io` (recommended; required if you later add
  Google or email-link sign-in). `localhost` is already allowed for local testing.

**Firestore database:**
- Left menu → **Build → Firestore Database → Create database**.
- Choose a location, start in **Production mode** (we'll paste rules next), **Enable**.
- Open the **Rules** tab and replace everything with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Each signed-in user can read/write ONLY their own document.
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

- Click **Publish**. This is what keeps your client data private — only a signed-in
  user can touch their own data, and nobody else can read it.

## 3. Paste your config into the app

Open `public/firebase-config.js` and replace the placeholders with the values from
step 1.3:

```js
window.FIREBASE_CONFIG = {
  apiKey:     "AIza...your key...",
  authDomain: "actionables-xxxx.firebaseapp.com",
  projectId:  "actionables-xxxx",
  appId:      "1:1234567890:web:abc123"
};
```

(These values are **not secrets** — they only identify your project. Your data is
protected by the security rules above, not by hiding these.)

Commit/push the change (or re-upload the file). GitLab re-publishes automatically.

## 4. Use it

- Reload the site. A **Cloud sync** sign-in screen appears.
- Click **Create account** the first time (email + a password of 6+ characters).
- On your other devices/browsers, open the same URL and **Sign in** with that same
  account. From then on, every change flows to all of them within a second or two.
- **Settings → Sync** shows the status ("Synced" / "Offline (cached)") and a **Sign out**.
- If you ever want to skip sync on one device, tap **Use offline only** on the sign-in
  screen — that device stays local.

### Moving your existing data into the cloud
The first device you sign in on uploads whatever it currently has as the starting point.
Every other device then adopts that. If two devices already hold different data before
you set up sync, sign in on the one with the data you want to keep **first**; on the
others you can re-import a backup if needed (Settings → Import backup).

---

## Notes & limits

- **Conflict handling** is last-write-wins. Fine for one person across their own devices;
  if two devices edit the very same second, the later save wins.
- **Free tier** (Firebase Spark) allows 50k reads / 20k writes per day and 1 GiB stored —
  far beyond a personal tracker's needs.
- **Privacy:** with the rules above and Email/Password, only someone who knows your
  account credentials can read the data. You can also keep the GitLab project private
  as a second layer.
- **Turning sync off:** blank out `firebase-config.js` back to the `YOUR_...` placeholders
  and reload — the app returns to local-only with no network calls.
