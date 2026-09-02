-- Il recapito smette di essere una cosa che si legge e diventa una cosa che si chiede.
ALTER TABLE posts ADD COLUMN contact_mode TEXT NOT NULL DEFAULT 'REQUEST';

CREATE TABLE contact_requests (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  decided_at INTEGER
);

CREATE INDEX contact_requests_to_idx ON contact_requests (to_user_id, status);
CREATE INDEX contact_requests_from_idx ON contact_requests (from_user_id);
CREATE INDEX contact_requests_post_idx ON contact_requests (post_id);
-- Una domanda sola per annuncio: chi e' stato rifiutato non riprova all'infinito.
CREATE UNIQUE INDEX contact_requests_unique ON contact_requests (post_id, from_user_id);
