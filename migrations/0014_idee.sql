-- Le idee tenute da parte, con un voto a testa di chi modera.
--
-- Quelle di IDEE.md entrano da sole (source = FILE, id = slug del titolo,
-- cosi' i voti restano attaccati anche se il testo cambia); quelle scritte
-- dal sito hanno un id casuale e chi le ha scritte (source = SITE). Lo stato
-- lo cambia solo l'amministratore: OPEN in attesa, DECIDED decisa,
-- IN_PROGRESS in lavorazione, DONE fatta, DROPPED scartata.
CREATE TABLE ideas (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX ideas_status_idx ON ideas (status);
--> statement-breakpoint
-- Un voto per persona e per idea: YES «la farei», LATER «non ora», NO «mai»,
-- con una riga di commento. Si cambia, non si somma: la chiave primaria e'
-- la coppia. Va via con l'idea e con l'account.
CREATE TABLE idea_votes (
  idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  comment TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (idea_id, user_id)
);
--> statement-breakpoint
-- "Quali idee non ho ancora votato": si cerca per persona.
CREATE INDEX idea_votes_user_idx ON idea_votes (user_id);
