CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`mime_type` text NOT NULL,
	`data` blob,
	`storage_key` text,
	`width` integer DEFAULT 0 NOT NULL,
	`height` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`post_id` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `photos_post_idx` ON `photos` (`post_id`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`title` text NOT NULL,
	`species` text NOT NULL,
	`breed` text,
	`pet_name` text,
	`sex` text,
	`age_range` text,
	`size` text,
	`color` text,
	`has_microchip` integer DEFAULT false NOT NULL,
	`microchip` text,
	`has_collar` integer DEFAULT false NOT NULL,
	`neutered` integer,
	`vaccinated` integer,
	`good_with_kids` integer,
	`good_with_pets` integer,
	`description` text NOT NULL,
	`extra_notes` text,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`province` text,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`event_date` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`resolved_at` integer,
	`contact_name` text NOT NULL,
	`contact_phone` text,
	`contact_email` text,
	`author_id` text NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `posts_kind_status_idx` ON `posts` (`kind`,`status`);--> statement-breakpoint
CREATE INDEX `posts_position_idx` ON `posts` (`lat`,`lng`);--> statement-breakpoint
CREATE INDEX `posts_created_idx` ON `posts` (`created_at`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_user_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE TABLE `sightings` (
	`id` text PRIMARY KEY NOT NULL,
	`message` text NOT NULL,
	`lat` real,
	`lng` real,
	`address` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`post_id` text NOT NULL,
	`author_id` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sightings_post_idx` ON `sightings` (`post_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`name` text NOT NULL,
	`phone` text,
	`google_id` text,
	`avatar_url` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`alert_lat` real,
	`alert_lng` real,
	`alert_radius_km` real DEFAULT 10 NOT NULL,
	`alerts_enabled` integer DEFAULT true NOT NULL,
	`alert_city` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_id_unique` ON `users` (`google_id`);