CREATE TABLE IF NOT EXISTS `report_saved` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`report_id` text NOT NULL,
	`name` text NOT NULL,
	`filters` text DEFAULT '{}' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `report_saved_user` ON `report_saved` (`company_id`,`user_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `report_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`report_id` text NOT NULL,
	`frequency` text NOT NULL,
	`next_run` text NOT NULL,
	`last_run` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `report_schedules_due` ON `report_schedules` (`next_run`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `report_tokens` (
	`company_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`created` text NOT NULL,
	`last_used` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `report_tokens_hash` ON `report_tokens` (`token_hash`);
