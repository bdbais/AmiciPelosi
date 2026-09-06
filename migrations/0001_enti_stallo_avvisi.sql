-- Lo stallo fra i tipi di annuncio: una casa per un periodo, mentre si cerca
-- la famiglia definitiva o mentre si aspetta che il padrone si faccia vivo.
ALTER TABLE `posts` ADD `foster_period` text;--> statement-breakpoint

-- Ogni quanto puo' squillare il telefono, e quando e' partito l'ultimo riepilogo.
ALTER TABLE `users` ADD `alert_every_minutes` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `alert_last_sent_at` integer;--> statement-breakpoint

-- Canili, gattili e associazioni: i loro dati, scritti una volta sola.
ALTER TABLE `users` ADD `account_type` text DEFAULT 'PERSON' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `org_name` text;--> statement-breakpoint
ALTER TABLE `users` ADD `org_address` text;--> statement-breakpoint
ALTER TABLE `users` ADD `org_city` text;--> statement-breakpoint
ALTER TABLE `users` ADD `org_lat` real;--> statement-breakpoint
ALTER TABLE `users` ADD `org_lng` real;--> statement-breakpoint
ALTER TABLE `users` ADD `org_phone` text;--> statement-breakpoint
ALTER TABLE `users` ADD `org_email` text;--> statement-breakpoint
ALTER TABLE `users` ADD `org_site` text;--> statement-breakpoint
ALTER TABLE `users` ADD `org_hours` text;--> statement-breakpoint
ALTER TABLE `users` ADD `org_verified` integer DEFAULT 0 NOT NULL;
