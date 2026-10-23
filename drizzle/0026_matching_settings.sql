CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_job_ratings` (
	`user_id` text NOT NULL,
	`job_id` text NOT NULL,
	`input_hash` text NOT NULL,
	`score` integer NOT NULL,
	`reason` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`user_id`, `job_id`)
);
--> statement-breakpoint
CREATE INDEX `ai_job_ratings_created` ON `ai_job_ratings` (`created`);
