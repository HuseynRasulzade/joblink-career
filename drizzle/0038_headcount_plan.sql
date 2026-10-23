CREATE TABLE `headcount_plan` (
	`company_id` text NOT NULL,
	`department` text NOT NULL,
	`planned` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`company_id`, `department`)
);
