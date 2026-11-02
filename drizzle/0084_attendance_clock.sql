ALTER TABLE `attendance_hours` ADD `clock_in` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_hours` ADD `clock_out` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_hours` ADD `overtime_status` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_hours` ADD `source` text DEFAULT 'manual' NOT NULL;
