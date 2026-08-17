package com.fable.actionables;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * Small helper around local notifications so MainActivity stays readable.
 * Only ever called after POST_NOTIFICATIONS (Android 13+) has been granted,
 * or on older Android versions where no runtime prompt is needed at all.
 */
final class NotificationsHelper {

    static final String CHANNEL_ID = "actionables_reminders";
    private static final int TEST_NOTIF_ID = 9001;

    private NotificationsHelper() {}

    /** Safe to call multiple times; creating an existing channel is a no-op. */
    static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager mgr = ctx.getSystemService(NotificationManager.class);
            if (mgr == null) return;
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Actionables reminders",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Daily brief and follow-up reminders from Actionables");
            mgr.createNotificationChannel(channel);
        }
    }

    /**
     * Posts a test notification. Caller must have already confirmed the
     * POST_NOTIFICATIONS permission is granted (or is on API < 33 where it's
     * not required) — this method does not check permission itself.
     */
    static void showTest(Context ctx) {
        ensureChannel(ctx);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Actionables")
                .setContentText("Test notification — reminders are working.")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true);

        NotificationManagerCompat nmc = NotificationManagerCompat.from(ctx);
        if (nmc.areNotificationsEnabled()) {
            try {
                nmc.notify(TEST_NOTIF_ID, builder.build());
            } catch (SecurityException ignored) {
                // Permission revoked between the check and the call — fail silently,
                // this is a best-effort test notification, not a critical path.
            }
        }
    }
}
