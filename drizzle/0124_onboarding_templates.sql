CREATE TABLE IF NOT EXISTS `onboarding_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`offset_days` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `onboarding_templates_company` ON `onboarding_templates` (`company_id`,`department`,`position`);
