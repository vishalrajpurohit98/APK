package com.fable.actionables;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Wraps Android's built-in android.speech.SpeechRecognizer (OS-level API,
 * no extra library/dependency needed) to provide the same event shape the
 * web app's original browser-based SpeechRecognition code expected:
 * interim results while listening, a final transcript, error reasons, and
 * an end event. This is what makes voice input actually transcribe inside
 * the Android WebView, which has no SpeechRecognition API of its own.
 *
 * Every callback is delivered back to JS as:
 *   window.__actionablesSpeechEvent(requestId, type, payload)
 * where type is 'result' | 'error' | 'end', matching what MainActivity wires up.
 */
final class SpeechController {

    interface EventSink {
        void onSpeechResult(String requestId, String transcript, boolean isFinal);
        void onSpeechError(String requestId, String reason);
        void onSpeechEnd(String requestId);
    }

    private static final String TAG = "Actionables/Speech";

    private final Context context;
    private final EventSink sink;
    private SpeechRecognizer recognizer;
    private String activeRequestId;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    SpeechController(Context context, EventSink sink) {
        this.context = context.getApplicationContext();
        this.sink = sink;
    }

    boolean isAvailable() {
        return SpeechRecognizer.isRecognitionAvailable(context);
    }

    /** Must be called on the main thread. Caller (MainActivity) is responsible for
     *  confirming RECORD_AUDIO is granted before calling this. */
    void start(String requestId) {
        stop(); // cancel any prior session first

        if (!isAvailable()) {
            sink.onSpeechError(requestId, "not-supported");
            return;
        }

        activeRequestId = requestId;
        recognizer = SpeechRecognizer.createSpeechRecognizer(context);
        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {}

            @Override
            public void onBeginningOfSpeech() {}

            @Override
            public void onRmsChanged(float rmsdB) {}

            @Override
            public void onBufferReceived(byte[] buffer) {}

            @Override
            public void onEndOfSpeech() {}

            @Override
            public void onError(int error) {
                String reason;
                switch (error) {
                    case SpeechRecognizer.ERROR_NO_MATCH:
                        reason = "no-speech";
                        break;
                    case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                        reason = "no-speech";
                        break;
                    case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                        reason = "not-allowed";
                        break;
                    case SpeechRecognizer.ERROR_NETWORK:
                    case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                        reason = "network";
                        break;
                    default:
                        reason = "voice-failed";
                }
                Log.w(TAG, "SpeechRecognizer error code=" + error + " -> " + reason);
                String reqId = activeRequestId;
                cleanup();
                if (reqId != null) sink.onSpeechError(reqId, reason);
            }

            @Override
            public void onResults(Bundle results) {
                String reqId = activeRequestId;
                List<String> matches = results != null
                        ? results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        : null;
                String best = (matches != null && !matches.isEmpty()) ? matches.get(0) : "";
                cleanup();
                if (reqId != null) {
                    sink.onSpeechResult(reqId, best, true);
                    sink.onSpeechEnd(reqId);
                }
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                if (activeRequestId == null) return;
                List<String> matches = partialResults != null
                        ? partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        : null;
                String best = (matches != null && !matches.isEmpty()) ? matches.get(0) : "";
                sink.onSpeechResult(activeRequestId, best, false);
            }

            @Override
            public void onEvent(int eventType, Bundle params) {}
        });

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.forLanguageTag("en-IN").toString());
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.getPackageName());

        try {
            recognizer.startListening(intent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start SpeechRecognizer", e);
            String reqId = activeRequestId;
            cleanup();
            if (reqId != null) sink.onSpeechError(reqId, "voice-failed");
        }
    }

    /** Stop listening early — e.g. the user tapped the mic button again. */
    void stop() {
        if (recognizer != null) {
            try {
                recognizer.stopListening();
                recognizer.cancel();
                recognizer.destroy();
            } catch (Exception ignored) {}
        }
        recognizer = null;
        activeRequestId = null;
    }

    private void cleanup() {
        if (recognizer != null) {
            try {
                recognizer.destroy();
            } catch (Exception ignored) {}
        }
        recognizer = null;
        activeRequestId = null;
    }
}
