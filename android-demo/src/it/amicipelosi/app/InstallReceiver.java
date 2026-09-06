package it.amicipelosi.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;

/**
 * Ascolta come e' andata l'installazione dell'aggiornamento.
 *
 * Android non installa niente di nascosto: quando il pacchetto e' pronto
 * chiede una conferma all'utente, e questo e' il punto in cui quella schermata
 * viene portata in primo piano.
 */
public class InstallReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS,
            PackageInstaller.STATUS_FAILURE);

        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) {
                confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(confirm);
            }
            return;
        }

        if (status != PackageInstaller.STATUS_SUCCESS) {
            // Non ha funzionato: togliamo il segno, cosi' l'app non ringrazia
            // per un aggiornamento che non c'e' stato e riprova al prossimo giro.
            Updater.prefs(context).edit().putBoolean(Updater.PREF_JUST_UPDATED, false).apply();
        }
    }
}
