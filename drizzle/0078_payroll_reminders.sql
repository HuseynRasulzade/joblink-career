CREATE TABLE `payroll_reminders` (
	`company_id` text NOT NULL,
	`key` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`company_id`, `key`)
);
