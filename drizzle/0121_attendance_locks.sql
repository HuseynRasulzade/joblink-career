CREATE TABLE IF NOT EXISTS `attendance_locks` (
	`company_id` text NOT NULL,
	`month` text NOT NULL,
	`locked_by` text DEFAULT '' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`locked_at` text NOT NULL,
	PRIMARY KEY(`company_id`, `month`)
);
