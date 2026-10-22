ALTER TABLE `company_employees` ADD `end_date` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `company_employees` ADD `exit_type` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `company_employees` ADD `exit_reason` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `company_employees` ADD `exit_note` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `company_employees` ADD `job_id` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `employee_events` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`type` text NOT NULL,
	`from_value` text DEFAULT '' NOT NULL,
	`to_value` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`actor_id` text DEFAULT '' NOT NULL,
	`event_date` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `employee_events_employee` ON `employee_events` (`employee_id`,`event_date`);
--> statement-breakpoint
CREATE INDEX `employee_events_company` ON `employee_events` (`company_id`,`event_date`);
--> statement-breakpoint
-- People already marked as left keep a usable end date: the day they were last updated.
UPDATE `company_employees` SET `end_date` = substr(`updated`, 1, 10) WHERE `status` = 'left' AND `end_date` = '';
