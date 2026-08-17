package com.fable.actionables;

import android.util.Base64;
import android.webkit.JavascriptInterface;

/**
 * Exposed to the WebView as window.Android (matches app.js: var A = window.Android || null).
 *
 * API shape matches what app.js already calls (read from the source, not guessed):
 *   - A.notifState()                    -> synchronous: 'granted' | 'denied' | 'na'
 *   - A.requestNotif()                  -> kick off POST_NOTIFICATIONS prompt (13+)
 *   - A.testNotification()              -> fire a local test notification
 *   - A.openAppSettings()               -> open this app's system settings page
 *   - A.saveFile(base64, filename, mime) -> see doc below
 *
 * Added for native speech-to-text (Android WebView has no SpeechRecognition API,
 * unlike desktop Chrome — this bridges to the OS's own android.speech.SpeechRecognizer):
 *   - A.startNativeSpeech(requestId)    -> begins listening; requests RECORD_AUDIO
 *     first if not already granted. Results stream back into JS via
 *     window.__actionablesSpeechEvent(requestId, type, payload) where type is
 *     one of 'result' | 'error' | 'end' | 'permdenied'.
 *   - A.stopNativeSpeech()              -> stop listening early (user taps mic again)
 *   - A.isNative()                      -> lets JS detect native wrapper vs browser
 *
 * DESIGN NOTE ON saveFile():
 * app.js's deliverFile() calls this synchronously and originally expected an
 * immediate return value. SAF's "create document" picker is inherently
 * asynchronous (system UI, waits on the user), so it can't return a real
 * result synchronously without freezing the WebView. saveFile() returns
 * "PENDING:<requestId>" right away; the real result arrives later via
 * window.__actionablesResolveSave(requestId, success, messageOrName).
 *
 * DESIGN NOTE ON notifState():
 * Checking whether a permission is currently granted is fast and synchronous
 * (no system UI involved), so notifState() safely returns a real value
 * immediately — matching what app.js already expects.
 */
public class NativeBridge {

    public interface Callbacks {
        void requestSaveFile(String base64, String filename, String mimeType, String requestId);
        String currentNotifState();
        void requestNotificationPermission();
        void showTestNotification();
        void openAppSettings();
        void startNativeSpeech(String requestId);
        void stopNativeSpeech();
    }

    private final Callbacks callbacks;

    public NativeBridge(Callbacks callbacks) {
        this.callbacks = callbacks;
    }

    @JavascriptInterface
    public String saveFile(String base64, String filename, String mimeType) {
        if (base64 == null || base64.isEmpty()) return "ERR_EMPTY_CONTENT";
        if (filename == null || filename.isEmpty()) return "ERR_NO_FILENAME";
        if (mimeType == null || mimeType.isEmpty()) return "ERR_NO_MIME";

        try {
            Base64.decode(base64, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            return "ERR_INVALID_BASE64";
        }

        String requestId = "sf_" + System.currentTimeMillis() + "_" + Math.round(Math.random() * 100000);
        callbacks.requestSaveFile(base64, filename, mimeType, requestId);
        return "PENDING:" + requestId;
    }

    @JavascriptInterface
    public String notifState() {
        return callbacks.currentNotifState();
    }

    @JavascriptInterface
    public void requestNotif() {
        callbacks.requestNotificationPermission();
    }

    @JavascriptInterface
    public void testNotification() {
        callbacks.showTestNotification();
    }

    @JavascriptInterface
    public void openAppSettings() {
        callbacks.openAppSettings();
    }

    /** Called only when the user taps the AI mic button — never at startup. */
    @JavascriptInterface
    public void startNativeSpeech(String requestId) {
        callbacks.startNativeSpeech(requestId);
    }

    @JavascriptInterface
    public void stopNativeSpeech() {
        callbacks.stopNativeSpeech();
    }

    @JavascriptInterface
    public boolean isNative() {
        return true;
    }
}
