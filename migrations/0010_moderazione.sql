-- La moderazione: chi puo' intervenire, chi e' stato bloccato, e perche'.
-- Il ruolo sta sull'utente e non in una tabella a parte: sono tre valori,
-- e la domanda "puo' moderare?" si fa a ogni richiesta.
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'USER';
--> statement-breakpoint
ALTER TABLE users ADD COLUMN banned_at INTEGER;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN banned_reason TEXT;
--> statement-breakpoint
-- Il motivo per cui un annuncio e' stato chiuso o rimosso da chi modera:
-- chi ha pubblicato lo deve poter leggere, altrimenti pensa a un guasto.
ALTER TABLE posts ADD COLUMN moderation_reason TEXT;
--> statement-breakpoint

-- Le segnalazioni di chi legge: "qui c'e' una persona in foto", "qui si
-- chiedono soldi". Chi segnala puo' sparire (reporter_id a NULL), la
-- segnalazione resta: e' sull'annuncio che serve, non sulla persona.
CREATE TABLE reports (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  handled_at INTEGER,
  handled_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  outcome TEXT
);
--> statement-breakpoint
CREATE INDEX reports_post_idx ON reports (post_id);
--> statement-breakpoint
-- La coda di chi modera e' "quelle non ancora gestite": handled_at IS NULL.
CREATE INDEX reports_handled_idx ON reports (handled_at);
--> statement-breakpoint

-- Il registro: chi ha fatto cosa, su cosa, e perche'. target_label porta il
-- titolo o il nome al momento dell'azione, cosi' la riga si legge anche
-- quando l'annuncio e' stato cancellato davvero o l'account non c'e' piu'.
CREATE TABLE moderation_log (
  id TEXT PRIMARY KEY NOT NULL,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_label TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX moderation_log_created_idx ON moderation_log (created_at);
