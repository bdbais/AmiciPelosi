package it.amicipelosi.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * Riapre l'app dopo l'aggiornamento.
 *
 * Android avvisa qui quando il pacchetto e' stato sostituito. Proviamo a
 * tornare subito dov'eravamo; sulle versioni recenti il sistema puo' vietare
 * a un'app spenta di aprirsi da sola, e allora resta un avviso da toccare.
 */
public class RestartReceiver extends BroadcastReceiver {

    private static final String CHANNEL = "aggiornamenti";
    private static final int NOTIFICATION_ID = 4207;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) return;

        Updater.prefs(context).edit().putBoolean(Updater.PREF_JUST_UPDATED, true).apply();

        Intent open = context.getPackageManager()
            .getLaunchIntentForPackage(context.getPackageName());
        if (open == null) return;
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        notifyReady(context, open);

        try {
            context.startActivity(open);
        } catch (Exception ignored) {
            // Ripartenza negata dal sistema: l'avviso qui sopra basta a rientrare.
        }
    }

    private void notifyReady(Context context, Intent open) {
        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL,
                context.getString(R.string.upd_channel), NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription(context.getString(R.string.upd_channel_body));
            manager.createNotificationChannel(channel);
        }

        int flags = PendingIntent.FLAG_UPDATE_CURRENT
            | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent tap = PendingIntent.getActivity(context, 0, open, flags);

        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(context, CHANNEL)
            : new Notification.Builder(context);

        manager.notify(NOTIFICATION_ID, builder
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(context.getString(R.string.upd_restart_title))
            .setContentText(context.getString(R.string.upd_restart_body))
            .setContentIntent(tap)
            .setAutoCancel(true)
            .build());
    }
}
