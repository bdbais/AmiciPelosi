package it.amicipelosi.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;

/**
 * Tiene l'app aggiornata da sola.
 *
 * All'avvio legge un piccolo manifesto pubblicato su GitHub, e se c'e' una
 * versione piu' recente lo dice con garbo, la scarica, ne verifica l'impronta
 * e la installa. Nessun passaggio dal browser, nessun negozio di applicazioni.
 */
public final class Updater {

    /**
     * Dove cercare il manifesto, in ordine. Il primo e' il canale ufficiale;
     * il secondo tiene in piedi gli aggiornamenti finche' quel deposito non
     * esiste. Cosi' il passaggio all'uno o all'altro non richiede una nuova
     * versione dell'app.
     */
    private static final String[] MANIFESTS = {
        "https://raw.githubusercontent.com/bdbais/amicipelosi-releases/main/latest.json",
        "https://raw.githubusercontent.com/bdbais/AmiciPelosi/releases/latest.json"
    };

    /** Da dove accettiamo di scaricare un APK. Tutto il resto viene ignorato. */
    private static final String[] ALLOWED_HOSTS = {
        "raw.githubusercontent.com",
        "github.com",
        "objects.githubusercontent.com",
        "release-assets.githubusercontent.com"
    };

    private static final String PREFS = "amicipelosi";
    static final String PREF_JUST_UPDATED = "appena_aggiornata";
    private static final String PREF_SKIPPED = "versione_rimandata";
    private static final String PREF_PENDING = "installazione_in_attesa";

    private static boolean checkedThisLaunch = false;

    private Updater() { }

    /** Una versione disponibile, cosi' come la descrive il manifesto. */
    private static final class Release {
        int versionCode;
        String versionName;
        String apkUrl;
        String sha256;
        long sizeBytes;
        String notes;
    }

    // ---------------------------------------------------------------- avvio

    /** Da chiamare all'apertura dell'app: lavora in disparte, senza bloccare. */
    public static void checkOnStart(final Activity activity) {
        if (checkedThisLaunch) return;
        checkedThisLaunch = true;

        new Thread(new Runnable() {
            @Override public void run() {
                final Release release = fetchManifest();
                if (release == null) return;

                final int installed = installedVersionCode(activity);
                if (release.versionCode <= installed) return;
                if (prefs(activity).getInt(PREF_SKIPPED, 0) == release.versionCode) return;

                activity.runOnUiThread(new Runnable() {
                    @Override public void run() { offer(activity, release); }
                });
            }
        }, "amicipelosi-updater").start();
    }

    /**
     * Da chiamare quando l'app torna in primo piano: se eravamo in attesa del
     * consenso a installare e adesso c'e', si riprende da dove si era rimasti.
     */
    public static void resumeIfPending(Activity activity) {
        if (!prefs(activity).getBoolean(PREF_PENDING, false)) return;
        if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) return;

        prefs(activity).edit().putBoolean(PREF_PENDING, false).remove(PREF_SKIPPED).apply();
        checkedThisLaunch = false;
        checkOnStart(activity);
    }

    /** Se l'app si e' appena aggiornata, ringrazia e lo dice. */
    public static void greetAfterUpdate(Activity activity) {
        SharedPreferences p = prefs(activity);
        if (!p.getBoolean(PREF_JUST_UPDATED, false)) return;
        p.edit().putBoolean(PREF_JUST_UPDATED, false).apply();

        String version = versionName(activity);
        new AlertDialog.Builder(activity)
            .setTitle(R.string.upd_done_title)
            .setMessage(activity.getString(R.string.upd_done_body, version))
            .setPositiveButton(R.string.upd_ok, null)
            .show();
    }

    // ------------------------------------------------------------ manifesto

    private static Release fetchManifest() {
        for (String url : MANIFESTS) {
            try {
                String body = readText(url);
                if (body == null) continue;

                JSONObject json = new JSONObject(body);
                Release r = new Release();
                r.versionCode = json.getInt("versionCode");
                r.versionName = json.optString("versionName", String.valueOf(r.versionCode));
                r.apkUrl = json.getString("apkUrl");
                r.sha256 = json.optString("sha256", "").toLowerCase(Locale.ROOT);
                r.sizeBytes = json.optLong("sizeBytes", -1);
                r.notes = pickNotes(json.optJSONObject("notes"));

                if (!hostAllowed(r.apkUrl)) continue;
                return r;
            } catch (Exception ignored) {
                // Un canale che non risponde non e' un problema: si prova il prossimo.
            }
        }
        return null;
    }

    /** Le note nella lingua del telefono, con l'italiano e l'inglese come rete. */
    private static String pickNotes(JSONObject notes) {
        if (notes == null) return "";
        String lang = Locale.getDefault().getLanguage();
        for (String key : new String[] { lang, "it", "en" }) {
            String value = notes.optString(key, "");
            if (value.length() > 0) return value;
        }
        return "";
    }

    // ------------------------------------------------------------- proposta

    private static void offer(final Activity activity, final Release release) {
        String body = activity.getString(R.string.upd_body, release.versionName);
        if (release.notes.length() > 0) body = body + "\n\n" + release.notes;

        new AlertDialog.Builder(activity)
            .setTitle(R.string.upd_title)
            .setMessage(body)
            .setCancelable(false)
            .setPositiveButton(R.string.upd_now, new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface dialog, int which) {
                    download(activity, release);
                }
            })
            .setNegativeButton(R.string.upd_later, new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface dialog, int which) {
                    prefs(activity).edit().putInt(PREF_SKIPPED, release.versionCode).apply();
                }
            })
            .show();
    }

    // ------------------------------------------------------------- download

    private static void download(final Activity activity, final Release release) {
        final AlertDialog progress = progressDialog(activity);
        progress.show();
        final ProgressBar bar = progress.findViewById(android.R.id.progress);
        final TextView label = progress.findViewById(android.R.id.text1);

        new Thread(new Runnable() {
            @Override public void run() {
                File apk = new File(activity.getCacheDir(), "aggiornamento.apk");
                String problem = null;
                try {
                    String digest = downloadTo(release.apkUrl, apk, release.sizeBytes, new Progress() {
                        @Override public void onProgress(final int percent) {
                            activity.runOnUiThread(new Runnable() {
                                @Override public void run() {
                                    bar.setIndeterminate(false);
                                    bar.setProgress(percent);
                                }
                            });
                        }
                    });

                    activity.runOnUiThread(new Runnable() {
                        @Override public void run() { label.setText(R.string.upd_verifying); }
                    });

                    if (release.sha256.length() > 0 && !release.sha256.equals(digest)) {
                        problem = activity.getString(R.string.upd_corrupt);
                    }
                } catch (Exception e) {
                    problem = activity.getString(R.string.upd_failed_body);
                }

                final String message = problem;
                final File downloaded = apk;
                activity.runOnUiThread(new Runnable() {
                    @Override public void run() {
                        progress.dismiss();
                        if (message != null) {
                            downloaded.delete();
                            new AlertDialog.Builder(activity)
                                .setTitle(R.string.upd_failed_title)
                                .setMessage(message)
                                .setPositiveButton(R.string.upd_ok, null)
                                .show();
                        } else {
                            install(activity, downloaded);
                        }
                    }
                });
            }
        }, "amicipelosi-download").start();
    }

    /** Riceve l'avanzamento in percentuale, oppure -1 se la misura non c'e'. */
    private interface Progress { void onProgress(int percent); }

    private static String downloadTo(String url, File target, long expectedSize, Progress progress)
            throws Exception {
        HttpURLConnection connection = open(url);
        MessageDigest sha = MessageDigest.getInstance("SHA-256");

        long total = expectedSize > 0 ? expectedSize : connection.getContentLength();
        long done = 0;
        int lastPercent = -1;

        try (InputStream in = connection.getInputStream();
             OutputStream out = new FileOutputStream(target)) {
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = in.read(buffer)) > 0) {
                out.write(buffer, 0, read);
                sha.update(buffer, 0, read);
                done += read;
                if (total > 0) {
                    int percent = (int) (done * 100 / total);
                    if (percent != lastPercent) { lastPercent = percent; progress.onProgress(percent); }
                }
            }
        } finally {
            connection.disconnect();
        }
        return hex(sha.digest());
    }

    // ----------------------------------------------------------- istallazione

    private static void install(final Activity activity, final File apk) {
        // Da Android 8 serve il consenso esplicito perche' un'app ne installi
        // un'altra: lo chiediamo spiegando perche', poi si riprende da qui.
        if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
            new AlertDialog.Builder(activity)
                .setTitle(R.string.upd_permission_title)
                .setMessage(R.string.upd_permission_body)
                .setPositiveButton(R.string.upd_permission_go, new DialogInterface.OnClickListener() {
                    @Override public void onClick(DialogInterface dialog, int which) {
                        Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + activity.getPackageName()));
                        settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        activity.startActivity(settings);
                        // Il consenso vale da subito: si riprende dal prossimo avvio.
                        prefs(activity).edit().putBoolean(PREF_PENDING, true).apply();
                    }
                })
                .setNegativeButton(R.string.upd_later, null)
                .show();
            return;
        }

        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    PackageInstaller installer = activity.getPackageManager().getPackageInstaller();
                    PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(
                        PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                    params.setAppPackageName(activity.getPackageName());

                    int sessionId = installer.createSession(params);
                    PackageInstaller.Session session = installer.openSession(sessionId);

                    try (InputStream in = new FileInputStream(apk);
                         OutputStream out = session.openWrite("amicipelosi", 0, apk.length())) {
                        byte[] buffer = new byte[16 * 1024];
                        int read;
                        while ((read = in.read(buffer)) > 0) out.write(buffer, 0, read);
                        session.fsync(out);
                    }

                    // Segniamo il passaggio: al prossimo avvio l'app ringrazia.
                    prefs(activity).edit().putBoolean(PREF_JUST_UPDATED, true).apply();

                    int flags = Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0;
                    PendingIntent callback = PendingIntent.getBroadcast(activity, sessionId,
                        new Intent(activity, InstallReceiver.class), flags);
                    session.commit(callback.getIntentSender());
                    session.close();
                } catch (Exception e) {
                    activity.runOnUiThread(new Runnable() {
                        @Override public void run() {
                            new AlertDialog.Builder(activity)
                                .setTitle(R.string.upd_failed_title)
                                .setMessage(R.string.upd_failed_body)
                                .setPositiveButton(R.string.upd_ok, null)
                                .show();
                        }
                    });
                }
            }
        }, "amicipelosi-install").start();
    }

    // -------------------------------------------------------------- utilita'

    private static AlertDialog progressDialog(Activity activity) {
        int pad = (int) (24 * activity.getResources().getDisplayMetrics().density);

        TextView label = new TextView(activity);
        label.setId(android.R.id.text1);
        label.setText(R.string.upd_downloading);
        label.setGravity(Gravity.CENTER);

        ProgressBar bar = new ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal);
        bar.setId(android.R.id.progress);
        bar.setIndeterminate(true);
        bar.setMax(100);

        LinearLayout box = new LinearLayout(activity);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(pad, pad, pad, pad);
        box.addView(label);
        box.addView(bar);

        return new AlertDialog.Builder(activity).setView(box).setCancelable(false).create();
    }

    private static HttpURLConnection open(String url) throws Exception {
        // Seguiamo i rimbalzi a mano, per non finire fuori dai domini ammessi.
        String current = url;
        for (int hop = 0; hop < 5; hop++) {
            if (!hostAllowed(current)) throw new SecurityException("Dominio non ammesso: " + current);

            HttpURLConnection connection = (HttpURLConnection) new URL(current).openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(30000);
            connection.setRequestProperty("User-Agent", "AmiciPelosi");

            int status = connection.getResponseCode();
            if (status == 301 || status == 302 || status == 303 || status == 307 || status == 308) {
                String next = connection.getHeaderField("Location");
                connection.disconnect();
                if (next == null) throw new Exception("Rimbalzo senza destinazione");
                current = new URL(new URL(current), next).toString();
                continue;
            }
            if (status != 200) { connection.disconnect(); throw new Exception("Risposta " + status); }
            return connection;
        }
        throw new Exception("Troppi rimbalzi");
    }

    private static String readText(String url) {
        try {
            HttpURLConnection connection = open(url);
            try (InputStream in = connection.getInputStream()) {
                java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
                byte[] chunk = new byte[4096];
                int read;
                while ((read = in.read(chunk)) > 0) buffer.write(chunk, 0, read);
                return buffer.toString("UTF-8");
            } finally {
                connection.disconnect();
            }
        } catch (Exception e) {
            return null;
        }
    }

    private static boolean hostAllowed(String url) {
        try {
            URL parsed = new URL(url);
            if (!"https".equals(parsed.getProtocol())) return false;
            for (String host : ALLOWED_HOSTS) if (host.equals(parsed.getHost())) return true;
        } catch (Exception ignored) { }
        return false;
    }

    private static String hex(byte[] bytes) {
        StringBuilder out = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) out.append(Character.forDigit((b >> 4) & 0xf, 16))
                               .append(Character.forDigit(b & 0xf, 16));
        return out.toString();
    }

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static int installedVersionCode(Context context) {
        try {
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            return info.versionCode;
        } catch (Exception e) {
            return 0;
        }
    }

    private static String versionName(Context context) {
        try {
            return context.getPackageManager()
                .getPackageInfo(context.getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "";
        }
    }
}
