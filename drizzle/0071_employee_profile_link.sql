ALTER TABLE `company_employees` ADD `user_id` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `company_employees` ADD `link_hash` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `company_employees` ADD `link_expires` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE INDEX `company_employees_user` ON `company_employees` (`user_id`);
--> statement-breakpoint
ALTER TABLE `employee_requests` ADD `source` text DEFAULT 'hr' NOT NULL;
--> statement-breakpoint
CREATE TABLE `employee_link_attempts` (
	`user_id` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `employee_link_attempts_user` ON `employee_link_attempts` (`user_id`,`created`);
