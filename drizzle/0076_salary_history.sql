CREATE TABLE `employee_salary_history` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`effective_from` text NOT NULL,
	`salary_cents` integer NOT NULL,
	`salary_type` text DEFAULT 'gross' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employee_salary_history_day` ON `employee_salary_history` (`employee_id`,`effective_from`);
--> statement-breakpoint
CREATE INDEX `employee_salary_history_company` ON `employee_salary_history` (`company_id`);
