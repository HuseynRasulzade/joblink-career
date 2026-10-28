CREATE TABLE `attendance_marks` (
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`day` text NOT NULL,
	`code` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`company_id`, `employee_id`, `day`)
);
--> statement-breakpoint
CREATE INDEX `attendance_marks_day` ON `attendance_marks` (`company_id`,`day`);
--> statement-breakpoint
CREATE TABLE `company_calendar` (
	`company_id` text NOT NULL,
	`day` text NOT NULL,
	`kind` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`company_id`, `day`)
);
