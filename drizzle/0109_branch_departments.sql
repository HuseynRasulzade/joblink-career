CREATE TABLE `branch_departments` (
	`company_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`department` text NOT NULL,
	PRIMARY KEY(`company_id`, `branch_id`, `department`)
);
