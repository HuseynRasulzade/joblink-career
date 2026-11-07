CREATE TABLE `hr_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`employee_id` text DEFAULT '' NOT NULL,
	`amount` real NOT NULL,
	`expense_date` text NOT NULL,
	`payee` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`paid_on` text DEFAULT '' NOT NULL,
	`pay_method` text DEFAULT '' NOT NULL,
	`pay_from` text DEFAULT '' NOT NULL,
	`pay_ref` text DEFAULT '' NOT NULL,
	`approved_by` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hr_expenses_company` ON `hr_expenses` (`company_id`,`expense_date`);
