CREATE TABLE `headcount_targets` (
	`company_id` text NOT NULL,
	`month` text NOT NULL,
	`target` integer NOT NULL,
	`updated` text NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`company_id`, `month`)
);
