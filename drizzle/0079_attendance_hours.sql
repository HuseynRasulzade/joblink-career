CREATE TABLE `attendance_hours` (
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`day` text NOT NULL,
	`hours` real DEFAULT 0 NOT NULL,
	`night_hours` real DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`company_id`, `employee_id`, `day`)
);
--> statement-breakpoint
CREATE INDEX `attendance_hours_day` ON `attendance_hours` (`company_id`,`day`);
