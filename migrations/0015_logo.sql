-- Il logo di un ente: canile, gattile, associazione.
--
-- Compare accanto al nome solo da verificati: chi e' in attesa puo' gia'
-- caricarlo, ma nessun altro lo vede finche' una persona non ha approvato
-- l'account. Un logo mostrato prima della verifica sarebbe il modo piu'
-- facile di sembrare un ente senza esserlo.
--
-- Il file sta fuori dal database (KV), come le foto: qui c'e' la chiave.
-- In locale, dove KV non c'e', il binario resta in org_logo_data, per lo
-- stesso motivo per cui le foto hanno la colonna data: lo stesso codice
-- deve girare in sviluppo e in produzione.
ALTER TABLE users ADD COLUMN org_logo_key TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN org_logo_data BLOB;
--> statement-breakpoint
-- Quando e' stato caricato: e' anche il segno che un logo c'e', in
-- entrambi gli ambienti, e il numero che cambia l'indirizzo dell'immagine
-- cosi' il browser non tiene quello vecchio.
ALTER TABLE users ADD COLUMN org_logo_at INTEGER;
