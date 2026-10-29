CREATE TABLE `payroll_recurring` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`deduction_kind` text DEFAULT 'general' NOT NULL,
	`from_month` text NOT NULL,
	`to_month` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payroll_recurring_company` ON `payroll_recurring` (`company_id`,`employee_id`);
--> statement-breakpoint
CREATE TABLE `payroll_carry` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`month` text NOT NULL,
	`label` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`deduction_kind` text DEFAULT 'general' NOT NULL,
	`from_month` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payroll_carry_month` ON `payroll_carry` (`company_id`,`month`);
