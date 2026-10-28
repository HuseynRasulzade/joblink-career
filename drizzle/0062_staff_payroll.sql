ALTER TABLE `company_employees` ADD `section` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `company_employees` ADD `salary_type` text DEFAULT 'gross' NOT NULL;
--> statement-breakpoint
ALTER TABLE `company_employees` ADD `sector` text DEFAULT 'private' NOT NULL;
--> statement-breakpoint
ALTER TABLE `company_employees` ADD `vacation_days` integer DEFAULT 21 NOT NULL;
--> statement-breakpoint
ALTER TABLE `company_employees` ADD `vacation_used` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `staff_units` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`section` text DEFAULT '' NOT NULL,
	`position` text DEFAULT '' NOT NULL,
	`planned` integer DEFAULT 1 NOT NULL,
	`salary_cents` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `staff_units_company` ON `staff_units` (`company_id`,`department`);
