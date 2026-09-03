-- Chi viene bloccato e rientra con un'altra email dallo stesso telefono.
--
-- Non si riconosce il telefono: si lascia un codice casuale nel browser (un
-- cookie) e si ricorda quali account l'hanno usato. Il codice non dice chi
-- sei, dice solo "questo browser ha gia' aperto quest'altro account". Il
-- blocco di un dispositivo lo decide una persona, mai il codice da solo.
CREATE TABLE devices (
  id TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  banned_at INTEGER,
  banned_reason TEXT,
  banned_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
--> statement-breakpoint
-- Quali account sono passati da quale browser. Se l'account viene cancellato
-- sparisce anche la sua riga: e' la promessa dei termini d'uso.
CREATE TABLE user_devices (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  first_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, device_id)
);
--> statement-breakpoint
CREATE INDEX user_devices_device_idx ON user_devices (device_id);
--> statement-breakpoint
-- L'indirizzo di rete, ma abbreviato: i primi 32 caratteri di un hash con un
-- segreto nostro. Non si torna indietro all'indirizzo, si puo' solo dire
-- "e' lo stesso di quest'altro". Le righe vivono 30 giorni: chi condivide
-- una rete pubblica con un bloccato non deve restare sospetto per sempre.
CREATE TABLE user_ips (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, ip_hash)
);
--> statement-breakpoint
CREATE INDEX user_ips_hash_idx ON user_ips (ip_hash);
--> statement-breakpoint
-- "Somiglia a un bloccato": un sospetto, non un verdetto. Resta finche' chi
-- modera non decide: bloccare, oppure "non e' la stessa persona".
ALTER TABLE users ADD COLUMN suspect_of TEXT REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN suspect_reason TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN suspect_at INTEGER;
