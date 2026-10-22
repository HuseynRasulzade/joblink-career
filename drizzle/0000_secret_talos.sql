CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`data` text NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `application_unique` ON `applications` (`job_id`,`candidate_id`);--> statement-breakpoint
CREATE INDEX `applications_candidate` ON `applications` (`candidate_id`);--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `jobs_owner` ON `jobs` (`owner`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`active` text DEFAULT '0' NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `profiles_active` ON `profiles` (`active`);--> statement-breakpoint
CREATE TABLE `saved` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_unique` ON `saved` (`user_id`,`job_id`);--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`created` text NOT NULL
);
