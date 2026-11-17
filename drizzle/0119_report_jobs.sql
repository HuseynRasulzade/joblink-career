CREATE TABLE IF NOT EXISTS `report_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`report_id` text NOT NULL,
	`title` text NOT NULL,
	`filters` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`finished` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `report_jobs_user` ON `report_jobs` (`company_id`,`user_id`,`created`);
