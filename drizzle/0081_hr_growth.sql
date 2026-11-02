CREATE TABLE `hr_settings` (
	`company_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`company_id`, `key`)
);
--> statement-breakpoint
CREATE TABLE `perf_cycles` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `perf_cycles_company` ON `perf_cycles` (`company_id`);
--> statement-breakpoint
CREATE TABLE `perf_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`cycle_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`title` text NOT NULL,
	`target` text DEFAULT '' NOT NULL,
	`weight` integer DEFAULT 1 NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`self_note` text DEFAULT '' NOT NULL,
	`manager_note` text DEFAULT '' NOT NULL,
	`score` integer,
	`proposed_by` text DEFAULT 'hr' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `perf_goals_cycle` ON `perf_goals` (`company_id`,`cycle_id`,`employee_id`);
--> statement-breakpoint
CREATE TABLE `perf_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`cycle_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`self_score` integer,
	`self_comment` text DEFAULT '' NOT NULL,
	`manager_score` integer,
	`manager_comment` text DEFAULT '' NOT NULL,
	`reviewer_name` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`acknowledged_at` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `perf_reviews_one` ON `perf_reviews` (`cycle_id`,`employee_id`);
--> statement-breakpoint
CREATE TABLE `trainings` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`provider` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'external' NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`end_date` text DEFAULT '' NOT NULL,
	`hours` integer DEFAULT 0 NOT NULL,
	`cost_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `trainings_company` ON `trainings` (`company_id`,`start_date`);
--> statement-breakpoint
CREATE TABLE `training_participants` (
	`training_id` text NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`training_id`, `employee_id`)
);
--> statement-breakpoint
CREATE INDEX `training_participants_employee` ON `training_participants` (`company_id`,`employee_id`);
--> statement-breakpoint
CREATE TABLE `shift_types` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `shift_types_company` ON `shift_types` (`company_id`);
--> statement-breakpoint
CREATE TABLE `shift_assignments` (
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`day` text NOT NULL,
	`shift_id` text NOT NULL,
	PRIMARY KEY(`company_id`, `employee_id`, `day`)
);
--> statement-breakpoint
CREATE INDEX `shift_assignments_day` ON `shift_assignments` (`company_id`,`day`);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`destination` text NOT NULL,
	`purpose` text DEFAULT '' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`daily_cents` integer DEFAULT 0 NOT NULL,
	`advance_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`requested_by` text DEFAULT 'hr' NOT NULL,
	`decided_by_name` text DEFAULT '' NOT NULL,
	`settled_cents` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `trips_company` ON `trips` (`company_id`,`employee_id`);
--> statement-breakpoint
CREATE TABLE `trip_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`company_id` text NOT NULL,
	`label` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`day` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `trip_expenses_trip` ON `trip_expenses` (`trip_id`);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`audience` text DEFAULT '' NOT NULL,
	`pinned` integer DEFAULT 0 NOT NULL,
	`expires` text DEFAULT '' NOT NULL,
	`author` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `announcements_company` ON `announcements` (`company_id`,`created`);
--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'enps' NOT NULL,
	`questions` text DEFAULT '[]' NOT NULL,
	`anonymous` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `surveys_company` ON `surveys` (`company_id`,`status`);
--> statement-breakpoint
CREATE TABLE `survey_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`company_id` text NOT NULL,
	`respondent` text NOT NULL,
	`employee_id` text DEFAULT '' NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `survey_responses_one` ON `survey_responses` (`survey_id`,`respondent`);
