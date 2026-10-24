ALTER TABLE `billing_invoices` ADD `reminded_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `ai_job_ratings` ADD `flagged` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `setting_history` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`summary` text NOT NULL,
	`actor_id` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `setting_history_key` ON `setting_history` (`key`,`created`);
