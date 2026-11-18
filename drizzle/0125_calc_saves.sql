CREATE TABLE IF NOT EXISTS `calc_saves` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`employee` text DEFAULT '' NOT NULL,
	`inputs` text DEFAULT '[]' NOT NULL,
	`results` text DEFAULT '[]' NOT NULL,
	`basis` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `calc_saves_company` ON `calc_saves` (`company_id`,`created`);
