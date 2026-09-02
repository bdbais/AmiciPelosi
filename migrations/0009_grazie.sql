-- Il grazie: un cuoricino da chi ha pubblicato a chi ha aiutato davvero.
-- Una volta sola, e resta scritto sulla segnalazione o sulla richiesta:
-- non serve una tabella, serve sapere quando e' arrivato.
ALTER TABLE sightings ADD COLUMN thanked_at INTEGER;
--> statement-breakpoint
ALTER TABLE contact_requests ADD COLUMN thanked_at INTEGER;
--> statement-breakpoint
-- Il profilo pubblico conta le segnalazioni fatte da una persona: senza
-- questo indice sarebbe una scansione intera a ogni apertura.
CREATE INDEX sightings_author_idx ON sightings (author_id);
