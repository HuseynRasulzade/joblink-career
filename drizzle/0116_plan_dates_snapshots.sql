ALTER TABLE `staff_units` ADD `start_month` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `staff_units` ADD `end_month` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `plan_snapshots` (
	`company_id` text NOT NULL,
	`year` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY (`company_id`, `year`, `kind`)
);
