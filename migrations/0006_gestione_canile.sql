-- Quello che serve a un canile o a un gattile e a una famiglia no: quando e
-- entrato, quando e uscito, e le cose che chi adotta chiede sempre e che
-- altrimenti si ripetono al telefono venti volte.
ALTER TABLE `pets` ADD `intake_date` text;--> statement-breakpoint
ALTER TABLE `pets` ADD `exit_date` text;--> statement-breakpoint
ALTER TABLE `pets` ADD `neutered` integer;--> statement-breakpoint
ALTER TABLE `pets` ADD `vaccinated` integer;--> statement-breakpoint
ALTER TABLE `pets` ADD `tested` text;--> statement-breakpoint
ALTER TABLE `pets` ADD `good_with_cats` integer;--> statement-breakpoint
ALTER TABLE `pets` ADD `good_with_dogs` integer;--> statement-breakpoint
ALTER TABLE `pets` ADD `good_with_kids` integer;--> statement-breakpoint
ALTER TABLE `pets` ADD `care_notes` text;--> statement-breakpoint

-- Dove l'ente pubblica le richieste di adozione.
ALTER TABLE `users` ADD `org_facebook` text;--> statement-breakpoint
ALTER TABLE `users` ADD `org_instagram` text;
