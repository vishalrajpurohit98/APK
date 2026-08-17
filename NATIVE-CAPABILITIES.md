# Native Android Capabilities — v2 (Real Speech-to-Text)

This build is based on `Actionables-WEB-FIXED-v5-READING-MODES.zip`. It
carries forward the file-save and notification work from the previous
native build, and adds the piece that was previously just a permission
stub: **microphone input now actually transcribes**, using Android's own
on-device speech engine.

---

## 1. File Save (PDF / Excel export) — `A.saveFile`

Unchanged from the previous native build. Uses Android's Storage Access
Framework (`ACTION_CREATE_DOCUMENT`) — the user picks any folder, native
code decodes the Base64 your existing jsPDF/XLSX code already produces and
writes it there. No `WRITE_EXTERNAL_STORAGE` / `MANAGE_EXTERNAL_STORAGE`.
Only `deliverFile()` in `app.js` was touched; PDF/Excel generation itself
was not.

---

## 2. Microphone — now with real transcription

**Files:** `SpeechController.java` (new), `NativeBridge.java`,
`MainActivity.java`, `app.js` (`aiStartVoice` and related)

### What changed from the previous build
Previously, `RECORD_AUDIO` was requested correctly but nothing actually
transcribed speech, because the standard Android WebView has no
`SpeechRecognition` API (that's a desktop-Chrome-only feature). This build
closes that gap using **`android.speech.SpeechRecognizer`** — a built-in
part of Android itself, no extra library or paid API needed.

### How it works
1. User taps the mic button → `aiStartVoice()` in `app.js`.
2. Since the app is running inside the native wrapper, it calls
   `A.startNativeSpeech(requestId)` instead of looking for
   `window.SpeechRecognition` (which still doesn't exist in the WebView —
   that part of the platform hasn't changed, we've just routed around it).
3. Native code checks `RECORD_AUDIO`. **First time only**, this is when the
   Android permission dialog appears — never at app startup.
4. If granted, `SpeechController` starts `SpeechRecognizer`, which uses the
   device's Google Speech service (on-device or online depending on the
   phone) to listen and transcribe.
5. Interim and final transcripts stream back into the same `aiState.input`
   field your UI already renders — the mic button, listening indicator, and
   AI input box all behave the same as they would with browser speech
   recognition.
6. If the user taps the mic again mid-listening, or backs out, the native
   session is cleanly stopped (`A.stopNativeSpeech()`).

### What happens on devices without Google's speech service
A tiny minority of Android devices (no Google Play Services — some Huawei
models, some custom ROMs, or emulators without a "Google APIs" system
image) don't have this OS-level service available.
`SpeechRecognizer.isRecognitionAvailable()` detects this up front and the
app shows *"Voice input is not supported on this device"* instead of
hanging or crashing. This is a genuine device limitation, not a bug in
this implementation — there's no speech engine to fall back to at that
point without shipping a third-party/paid speech SDK.

### The web version is untouched
If you open the same `app.js` in a regular desktop browser (not the
installed app), `A` is `null`, so it falls straight back to the original
`window.SpeechRecognition` code path exactly as it was before — nothing
about the website behavior changed.

---

## 3. Notifications

Unchanged from the previous native build. `POST_NOTIFICATIONS` (Android
13+) requested only when the user enables the daily-brief toggle or taps
Allow — never at startup. `A.notifState()`, `A.requestNotif()`,
`A.testNotification()`, `A.openAppSettings()` all match the API your
`app.js` already expects.

---

## Manifest permissions — final list

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```
No `WRITE_EXTERNAL_STORAGE`, no `MANAGE_EXTERNAL_STORAGE`.

---

## Test checklist

Build the APK first (`BUILD-APK-INSTRUCTIONS.md` — push to GitHub, Actions
tab builds it automatically). Then, on a **real Android device** (an
emulator without Google Play services will fail the mic test specifically —
see note above):

| # | Test | Expected result |
|---|------|------------------|
| 1 | Export → PDF | System file picker opens, filename pre-filled. Pick a folder → toast "Saved → …". File opens correctly. |
| 2 | Export → Excel | Same flow, `.xlsx` opens correctly in Excel/Sheets. |
| 3 | Cancel the picker | Toast "Save cancelled" — no crash, no partial file. |
| 4 | AI chat → tap mic (fresh install) | Permission dialog appears **only now**, not at launch. |
| 5 | Grant mic permission → speak a sentence | Words appear live in the AI input box, then finalize when you stop speaking. |
| 6 | Deny mic permission | Toast "Microphone permission denied"; typing in AI chat still works normally. |
| 7 | Tap mic, tap again mid-listening to cancel | Listening stops cleanly, no stuck "listening" state. |
| 8 | Settings → enable daily brief (fresh install, Android 13+) | Notification permission dialog appears **only now**. |
| 9 | Settings → "Send test notification" | Real notification appears in the system tray. |
| 10 | Deny notification permission | Settings shows "Not allowed" + "Allow" button; rest of the app works normally. |
| 11 | Force-close and reopen after denying any permission | Opens straight to normal use, no prompts on startup, no crash loops. |

## Files changed/added in this build
- `android/app/src/main/AndroidManifest.xml` — permissions
- `android/app/src/main/java/com/fable/actionables/MainActivity.java` — new
- `android/app/src/main/java/com/fable/actionables/NativeBridge.java` — new
- `android/app/src/main/java/com/fable/actionables/NotificationsHelper.java` — new
- `android/app/src/main/java/com/fable/actionables/SpeechController.java` — new (real STT)
- `android/app/build.gradle` — `androidx.activity`, `androidx.core`, Java 8 `compileOptions`
- `app.js` — `deliverFile()`, `aiStartVoice()`/`aiStopVoice()`/`aiVoiceSupported()`
  plus new `aiStartNativeVoice()`/`aiStopNativeVoice()` and the
  `window.__actionablesSpeechEvent` callback. PDF/Excel generation code and
  the browser `SpeechRecognition` fallback path are both untouched.

## What still can't be verified without a real device or emulator
I don't have a way to run the compiled APK here (no Android SDK/emulator in
this environment, and Gradle itself is network-blocked — see
`BUILD-APK-INSTRUCTIONS.md`). What I *did* verify:
- `app.js` passes Node's own syntax parser (`node --check`) — genuinely
  confirmed, not assumed.
- Every Java file's braces/parens are balanced.
- Every native API call from `app.js` matches a method actually implemented
  in `NativeBridge.java`/`MainActivity.java` (checked by name, one by one).
- `compileOptions` (Java 8) is set, avoiding the same build failure caught
  in the previous version before you built it.

The GitHub Actions build is the first point this code gets a real compiler
run. If it fails, paste me the error log from the Actions tab and I'll fix it.
