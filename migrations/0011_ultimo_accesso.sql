-- L'ultimo accesso di ogni persona e da dove: si aggiorna al login e, al
-- massimo una volta l'ora, mentre usa il sito. Serve a chi modera per vedere
-- chi c'e' davvero, chi e' sparito, e chi usa l'app invece del sito.
ALTER TABLE users ADD COLUMN last_seen_at INTEGER;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN last_client TEXT;
