CREATE TABLE `plan_year_state` (
	`company_id` text NOT NULL,
	`year` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL,
	`updated` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`company_id`, `year`)
);
