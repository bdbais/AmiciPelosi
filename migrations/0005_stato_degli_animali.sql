-- Una scheda non si cancella mai da sola: chi e stato adottato esce dall'elenco
-- di chi cerca casa ma resta nello storico di chi l'ha accudito, e chi non c'e
-- piu resta dov'e, perche quella scheda e un ricordo prima che un archivio.
ALTER TABLE `pets` ADD `status` text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE `pets` ADD `farewell_date` text;
