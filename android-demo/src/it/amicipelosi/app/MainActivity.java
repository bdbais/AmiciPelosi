package it.amicipelosi.app;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Contenitore della demo di Amici Pelosi.
 *
 * La demo vive dentro l'app (assets/index.html), quindi funziona anche senza
 * rete: serve a provare navigazione, schermate e suoni sul telefono vero.
 */
public class MainActivity extends Activity {

    private WebView web;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);

        // La posizione serve alla schermata "vicino a me".
        if (Build.VERSION.SDK_INT >= 23
                && checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                        != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] { Manifest.permission.ACCESS_FINE_LOCATION }, 1);
        }

        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);

        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                    GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });

        // Sotto la barra di stato, sopra quella di navigazione.
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        // La versione viaggia nell'indirizzo: la demo la mostra fra le impostazioni.
        String version = "";
        try {
            version = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Exception ignored) { }
        web.loadUrl("file:///android_asset/index.html?app=1&v=" + Uri.encode(version));
        setContentView(web);

        // Se siamo appena tornati da un aggiornamento, l'app lo dice e ringrazia.
        Updater.greetAfterUpdate(this);
        // Poi guarda in disparte se c'e' una versione piu' recente.
        Updater.checkOnStart(this);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Il permesso a installare puo' essere appena stato concesso: si riprende.
        Updater.resumeIfPending(this);
    }

    @Override
    public void onBackPressed() {
        // Il tasto indietro naviga dentro la demo prima di uscire.
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
