package it.amicipelosi.app;

import android.os.Bundle;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

/**
 * L'ingresso dell'app vera.
 *
 * Fa quello che farebbe la LauncherActivity di serie - apre il sito dentro il
 * motore di Chrome, cosi' restano attive notifiche push, GPS e fotocamera - e
 * in piu' controlla se e' uscita una versione nuova. Senza questo passaggio,
 * chi installa l'app dal volantino o dal codice a barre resterebbe fermo a
 * quella versione per sempre.
 */
public class MainLauncher extends LauncherActivity {

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        Updater.greetAfterUpdate(this);
        Updater.checkOnStart(this);
    }

    @Override
    protected void onResume() {
        super.onResume();
        Updater.resumeIfPending(this);
    }
}
