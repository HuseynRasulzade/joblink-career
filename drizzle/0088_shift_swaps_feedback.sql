CREATE TABLE `shift_swaps` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`day` text NOT NULL,
	`from_employee` text NOT NULL,
	`to_employee` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'asked' NOT NULL,
	`decided_by_name` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `shift_swaps_company` ON `shift_swaps` (`company_id`,`status`,`day`);
--> statement-breakpoint
CREATE TABLE `perf_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`cycle_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`giver_id` text NOT NULL,
	`status` text DEFAULT 'asked' NOT NULL,
	`score` integer,
	`comment` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`answered` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `perf_feedback_one` ON `perf_feedback` (`cycle_id`,`subject_id`,`giver_id`);
--> statement-breakpoint
ALTER TABLE `surveys` ADD `repeat_months` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `surveys` ADD `series_id` text DEFAULT '' NOT NULL;
