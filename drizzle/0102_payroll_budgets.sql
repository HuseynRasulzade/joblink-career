CREATE TABLE `payroll_budgets` (
	`company_id` text NOT NULL,
	`month` text NOT NULL,
	`amount` real NOT NULL,
	`updated` text NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`company_id`, `month`)
);
