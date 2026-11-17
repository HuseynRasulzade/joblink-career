CREATE TABLE IF NOT EXISTS `employee_custom_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`label` text NOT NULL,
	`kind` text DEFAULT 'text' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `employee_custom_fields_company` ON `employee_custom_fields` (`company_id`,`position`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `employee_custom_values` (
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`field_id` text NOT NULL,
	`value` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`employee_id`, `field_id`)
);
--> statement-breakpoint
ALTER TABLE `staff_units` ADD `critical` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `succession` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`readiness` text DEFAULT 'later' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `succession_pair` ON `succession` (`unit_id`,`employee_id`);
