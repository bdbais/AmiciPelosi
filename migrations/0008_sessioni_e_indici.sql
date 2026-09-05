-- La versione di sessione: alzarla di uno butta fuori tutti i dispositivi.
ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
-- Gli indici che mancavano alle query fatte a ogni pagina e a ogni annuncio.
CREATE INDEX posts_author_idx ON posts (author_id);
--> statement-breakpoint
CREATE INDEX trusted_people_person_idx ON trusted_people (person_id);
--> statement-breakpoint
CREATE INDEX users_alerts_idx ON users (alerts_enabled, alert_lat, alert_lng);
