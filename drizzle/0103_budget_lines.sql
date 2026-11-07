CREATE TABLE `budget_lines` (
	`company_id` text NOT NULL,
	`month` text NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`kind` text DEFAULT 'budget' NOT NULL,
	`amount` real NOT NULL,
	`updated` text NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`company_id`, `month`, `department`, `category`, `kind`)
);
--> statement-breakpoint
INSERT INTO `budget_lines` (`company_id`, `month`, `department`, `category`, `kind`, `amount`, `updated`, `updated_by`)
SELECT `company_id`, `month`, '', 'payroll', 'budget', `amount`, `updated`, `updated_by` FROM `payroll_budgets`;
