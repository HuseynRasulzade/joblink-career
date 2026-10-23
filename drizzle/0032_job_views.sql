CREATE TABLE `job_views` (
	`job_id` text NOT NULL,
	`viewer` text NOT NULL,
	`day` text NOT NULL,
	PRIMARY KEY(`job_id`, `viewer`, `day`)
);
--> statement-breakpoint
CREATE INDEX `job_views_day` ON `job_views` (`day`);
