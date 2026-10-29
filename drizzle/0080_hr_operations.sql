CREATE TABLE `leave_schedule` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`year` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`days` integer NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`proposed_by` text DEFAULT 'hr' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`decided_by_name` text DEFAULT '' NOT NULL,
	`decided_at` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leave_schedule_company` ON `leave_schedule` (`company_id`,`year`);
--> statement-breakpoint
CREATE INDEX `leave_schedule_employee` ON `leave_schedule` (`employee_id`);
--> statement-breakpoint
ALTER TABLE `employee_documents` ADD `expires` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `offboarding_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`planned_end` text DEFAULT '' NOT NULL,
	`checklist` text DEFAULT '{}' NOT NULL,
	`exit_interview` text DEFAULT '{}' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`closed_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `offboarding_cases_employee` ON `offboarding_cases` (`company_id`,`employee_id`);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`serial` text DEFAULT '' NOT NULL,
	`inventory_no` text DEFAULT '' NOT NULL,
	`value_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'stock' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assets_company` ON `assets` (`company_id`,`status`);
--> statement-breakpoint
CREATE TABLE `asset_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`issued_on` text NOT NULL,
	`returned_on` text DEFAULT '' NOT NULL,
	`condition_out` text DEFAULT '' NOT NULL,
	`condition_in` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `asset_assignments_employee` ON `asset_assignments` (`company_id`,`employee_id`);
--> statement-breakpoint
CREATE INDEX `asset_assignments_asset` ON `asset_assignments` (`asset_id`);
