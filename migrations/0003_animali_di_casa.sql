-- La scheda del proprio animale: le tre foto che servirebbero il giorno in cui
-- sparisce, il microchip, il libretto, e il diario di quello che gli succede.
-- Nasce privata e resta privata finche' non si decide altrimenti.
CREATE TABLE `pets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`breed` text,
	`sex` text,
	`birth_date` text,
	`color` text,
	`microchip` text,
	`notes` text,
	`shared_with_circle` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `pets_owner_idx` ON `pets` (`owner_id`);--> statement-breakpoint

CREATE TABLE `pet_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`slot` text NOT NULL,
	`mime_type` text NOT NULL,
	`data` blob,
	`storage_key` text,
	`width` integer DEFAULT 0 NOT NULL,
	`height` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `pet_photos_pet_idx` ON `pet_photos` (`pet_id`);--> statement-breakpoint

CREATE TABLE `pet_events` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`note` text,
	`happened_at` text NOT NULL,
	`recurs_yearly` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `pet_events_pet_idx` ON `pet_events` (`pet_id`);--> statement-breakpoint

CREATE TABLE `trusted_people` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`person_id` text NOT NULL,
	`scope` text DEFAULT 'ALL' NOT NULL,
	`primary_vet` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `trusted_owner_idx` ON `trusted_people` (`owner_id`,`person_id`);
