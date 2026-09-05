-- La foto di una segnalazione: "guarda, questo qui ti sembra il tuo?".
-- E' la fotografia che chiude una ricerca, e prima non si poteva mandare.
CREATE TABLE `sighting_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`mime_type` text NOT NULL,
	`data` blob,
	`storage_key` text,
	`width` integer DEFAULT 0 NOT NULL,
	`height` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`sighting_id` text NOT NULL,
	FOREIGN KEY (`sighting_id`) REFERENCES `sightings`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `sighting_photos_idx` ON `sighting_photos` (`sighting_id`);
