ALTER TABLE `company_employees` ADD `probation_end` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `company_employees` ADD `probation_reminded` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `employee_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`data` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`uploaded_by` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `employee_documents_employee` ON `employee_documents` (`company_id`,`employee_id`);
