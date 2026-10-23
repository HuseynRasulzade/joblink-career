CREATE TABLE `talent_pool` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`source_job_id` text DEFAULT '' NOT NULL,
	`added_by` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `talent_pool_unique` ON `talent_pool` (`company_id`, `candidate_id`);
--> statement-breakpoint
CREATE INDEX `talent_pool_candidate` ON `talent_pool` (`candidate_id`);
