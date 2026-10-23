CREATE TABLE `job_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`filters` text NOT NULL,
	`last_check` text NOT NULL,
	`seen` text DEFAULT '[]' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `job_alerts_user` ON `job_alerts` (`user_id`);
