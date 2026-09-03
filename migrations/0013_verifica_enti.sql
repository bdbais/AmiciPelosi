-- Chi si dichiara canile, gattile, associazione, colonia o veterinario non lo
-- e' finche' una persona non lo ha guardato.
--
-- Scrivere "canile" in un modulo non costa niente, e il bollino di ente apre
-- l'inserimento in blocco e il badge accanto al nome: sarebbe il primo posto
-- da cui qualcuno prova a sembrare piu' affidabile di quello che e'. Il tipo
-- scelto resta memorizzato, ma vale solo dopo l'approvazione; fino a quel
-- momento l'account conta come una persona.
--
-- NONE per le persone; PENDING in coda; VERIFIED approvato; REJECTED con il
-- motivo in verification_note, che la persona legge e puo' ripresentare.
ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'NONE';
--> statement-breakpoint
-- Il link che dimostra chi e': il sito, la pagina Facebook, l'albo.
ALTER TABLE users ADD COLUMN proof_url TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN verified_at INTEGER;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN verified_by TEXT REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
-- Il motivo del rifiuto, oppure una nota di chi approva.
ALTER TABLE users ADD COLUMN verification_note TEXT;
--> statement-breakpoint
-- Chi si era gia' dichiarato ente entra in coda senza link: chi modera vede
-- che manca e glielo chiede, oppure lo verifica da se'. Nessuno perde il tipo
-- che aveva scelto, lo riavra' con l'approvazione.
UPDATE users SET account_status = 'PENDING' WHERE account_type <> 'PERSON';
--> statement-breakpoint
CREATE INDEX users_account_status_idx ON users (account_status);
