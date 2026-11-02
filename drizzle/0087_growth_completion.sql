ALTER TABLE `trainings` ADD `valid_months` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `trainings` ADD `required_for` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `training_participants` ADD `certificate_no` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `training_participants` ADD `completed_on` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `training_participants` ADD `valid_until` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `announcements` ADD `requires_ack` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TABLE `announcement_reads` (
	`announcement_id` text NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`read_at` text NOT NULL,
	`acked_at` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`announcement_id`, `employee_id`)
);
--> statement-breakpoint
CREATE TABLE `one_on_ones` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`day` text NOT NULL,
	`topics` text DEFAULT '' NOT NULL,
	`decisions` text DEFAULT '' NOT NULL,
	`next_step` text DEFAULT '' NOT NULL,
	`shared` integer DEFAULT 1 NOT NULL,
	`author_kind` text DEFAULT 'hr' NOT NULL,
	`author_name` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `one_on_ones_employee` ON `one_on_ones` (`company_id`,`employee_id`,`day`);
--> statement-breakpoint
ALTER TABLE `trips` ADD `abroad` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `trips` ADD `manager_status` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trips` ADD `manager_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trips` ADD `manager_note` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `profile_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`field` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`decided_by_name` text DEFAULT '' NOT NULL,
	`decided_at` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `profile_changes_company` ON `profile_changes` (`company_id`,`status`,`created`);
