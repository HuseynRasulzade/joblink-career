CREATE TABLE `payroll_inputs` (
	`company_id` text NOT NULL,
	`month` text NOT NULL,
	`employee_id` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`company_id`, `month`, `employee_id`)
);
--> statement-breakpoint
CREATE TABLE `payroll_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`month` text NOT NULL,
	`kind` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`paid_on` text NOT NULL,
	`method` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payroll_payments_month` ON `payroll_payments` (`company_id`,`month`);
--> statement-breakpoint
CREATE TABLE `payroll_runs` (
	`company_id` text NOT NULL,
	`month` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`snapshot` text DEFAULT '' NOT NULL,
	`approved_by` text DEFAULT '' NOT NULL,
	`approved_by_name` text DEFAULT '' NOT NULL,
	`approved_at` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`company_id`, `month`)
);
--> statement-breakpoint
CREATE TABLE `payroll_settings` (
	`company_id` text PRIMARY KEY NOT NULL,
	`advance_day` integer DEFAULT 0 NOT NULL,
	`pay_day` integer DEFAULT 28 NOT NULL,
	`updated` text NOT NULL
);
