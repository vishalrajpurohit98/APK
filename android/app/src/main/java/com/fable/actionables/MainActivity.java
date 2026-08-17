package com.fable.actionables;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;
import android.webkit.WebView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity implements NativeBridge.Callbacks, SpeechController.EventSink {

    private static final String TAG = "Actionables";

    // ---- File save (SAF) state ----
    private final Map<String, PendingSave> pendingSaves = new HashMap<>();
    private String launchedRequestId;
    private ActivityResultLauncher<String> createDocumentLauncher;

    // ---- Mic / speech state ----
    private ActivityResultLauncher<String> micPermissionLauncher;
    private String pendingSpeechRequestId; // waiting on the mic permission dialog
    private SpeechController speechController;

    // ---- Notification permission state ----
    private ActivityResultLauncher<String> notifPermissionLauncher;

    private static class PendingSave {
        final String base64;
        final String mimeType;
        PendingSave(String base64, String mimeType) {
            this.base64 = base64;
            this.mimeType = mimeType;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        NotificationsHelper.ensureChannel(this);
        speechController = new SpeechController(this, this);
        registerLaunchers();

        WebView webView = this.bridge.getWebView();
        webView.addJavascriptInterface(new NativeBridge(this), "Android");
    }

    @Override
    protected void onDestroy() {
        if (speechController != null) speechController.stop();
        super.onDestroy();
    }

    private void registerLaunchers() {
        createDocumentLauncher = registerForActivityResult(
                new ActivityResultContracts.CreateDocument("*/*"),
                this::onDocumentPicked
        );

        micPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(),
                granted -> {
                    String reqId = pendingSpeechRequestId;
                    pendingSpeechRequestId = null;
                    if (reqId == null) return;
                    if (granted) {
                        speechController.start(reqId);
                    } else {
                        onSpeechError(reqId, "not-allowed");
                    }
                }
        );

        notifPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(),
                granted -> notifyPermissionChanged()
        );
    }

    // ---------------------------------------------------------------
    // saveFile: SAF picker flow
    // ---------------------------------------------------------------

    @Override
    public void requestSaveFile(String base64, String filename, String mimeType, String requestId) {
        runOnUiThread(() -> {
            pendingSaves.put(requestId, new PendingSave(base64, mimeType));
            launchedRequestId = requestId;
            try {
                createDocumentLauncher.launch(filename);
            } catch (Exception e) {
                Log.e(TAG, "Failed to launch SAF picker", e);
                pendingSaves.remove(requestId);
                launchedRequestId = null;
                resolveSaveFile(requestId, false, "ERR_PICKER_UNAVAILABLE");
            }
        });
    }

    private void onDocumentPicked(Uri uri) {
        String requestId = launchedRequestId;
        launchedRequestId = null;
        if (requestId == null) return;

        PendingSave pending = pendingSaves.remove(requestId);
        if (pending == null) return;

        if (uri == null) {
            resolveSaveFile(requestId, false, "ERR_CANCELLED");
            return;
        }

        try {
            byte[] bytes = Base64.decode(pending.base64, Base64.DEFAULT);
            try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                if (out == null) {
                    resolveSaveFile(requestId, false, "ERR_CANNOT_OPEN_OUTPUT");
                    return;
                }
                out.write(bytes);
                out.flush();
            }
            String displayName = queryDisplayName(uri);
            resolveSaveFile(requestId, true, displayName != null ? displayName : "file");
        } catch (IllegalArgumentException e) {
            Log.e(TAG, "Base64 decode failed", e);
            resolveSaveFile(requestId, false, "ERR_INVALID_BASE64");
        } catch (Exception e) {
            Log.e(TAG, "Failed writing file via SAF", e);
            resolveSaveFile(requestId, false, "ERR_WRITE_FAILED");
        }
    }

    private String queryDisplayName(Uri uri) {
        try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) return cursor.getString(idx);
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void resolveSaveFile(String requestId, boolean success, String messageOrName) {
        String js = "window.__actionablesResolveSave && window.__actionablesResolveSave("
                + jsString(requestId) + "," + success + "," + jsString(messageOrName) + ")";
        runOnUiThread(() -> bridge.getWebView().evaluateJavascript(js, null));
    }

    // ---------------------------------------------------------------
    // Native speech-to-text
    // Requested/started only when the user taps the AI mic button —
    // never at app startup. RECORD_AUDIO is requested here the first
    // time it's needed; subsequent taps skip straight to listening.
    // ---------------------------------------------------------------

    @Override
    public void startNativeSpeech(String requestId) {
        runOnUiThread(() -> {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                    == PackageManager.PERMISSION_GRANTED) {
                speechController.start(requestId);
                return;
            }
            pendingSpeechRequestId = requestId;
            micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO);
        });
    }

    @Override
    public void stopNativeSpeech() {
        runOnUiThread(() -> speechController.stop());
    }

    @Override
    public void onSpeechResult(String requestId, String transcript, boolean isFinal) {
        String js = "window.__actionablesSpeechEvent && window.__actionablesSpeechEvent("
                + jsString(requestId) + ",'result',{transcript:" + jsString(transcript)
                + ",isFinal:" + isFinal + "})";
        runOnUiThread(() -> bridge.getWebView().evaluateJavascript(js, null));
    }

    @Override
    public void onSpeechError(String requestId, String reason) {
        String js = "window.__actionablesSpeechEvent && window.__actionablesSpeechEvent("
                + jsString(requestId) + ",'error',{reason:" + jsString(reason) + "})";
        runOnUiThread(() -> bridge.getWebView().evaluateJavascript(js, null));
    }

    @Override
    public void onSpeechEnd(String requestId) {
        String js = "window.__actionablesSpeechEvent && window.__actionablesSpeechEvent("
                + jsString(requestId) + ",'end',null)";
        runOnUiThread(() -> bridge.getWebView().evaluateJavascript(js, null));
    }

    // ---------------------------------------------------------------
    // Notification permission
    // ---------------------------------------------------------------

    @Override
    public String currentNotifState() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return "na";
        }
        boolean granted = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
        return granted ? "granted" : "denied";
    }

    @Override
    public void requestNotificationPermission() {
        runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                notifyPermissionChanged();
                return;
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED) {
                notifyPermissionChanged();
                return;
            }
            notifPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
        });
    }

    @Override
    public void showTestNotification() {
        NotificationsHelper.showTest(this);
    }

    @Override
    public void openAppSettings() {
        runOnUiThread(() -> {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getPackageName(), null));
            startActivity(intent);
        });
    }

    private void notifyPermissionChanged() {
        String js = "window.__permChanged && window.__permChanged()";
        runOnUiThread(() -> bridge.getWebView().evaluateJavascript(js, null));
    }

    private static String jsString(String s) {
        if (s == null) return "null";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
