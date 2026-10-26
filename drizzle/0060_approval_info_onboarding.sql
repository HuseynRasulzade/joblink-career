ALTER TABLE `approval_requests` ADD `reply` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `approval_requests` ADD `escalated_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `employee_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`title` text NOT NULL,
	`due` text DEFAULT '' NOT NULL,
	`done` integer DEFAULT 0 NOT NULL,
	`done_at` text DEFAULT '' NOT NULL,
	`done_by` text DEFAULT '' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `employee_tasks_employee` ON `employee_tasks` (`company_id`,`employee_id`,`position`);
