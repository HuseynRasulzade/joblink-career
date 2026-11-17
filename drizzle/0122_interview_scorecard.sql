CREATE TABLE IF NOT EXISTS `interview_criteria` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`label` text NOT NULL,
	`weight` integer DEFAULT 1 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `interview_criteria_company` ON `interview_criteria` (`company_id`,`position`);
--> statement-breakpoint
ALTER TABLE `interviews` ADD `scores` text DEFAULT '{}' NOT NULL;
