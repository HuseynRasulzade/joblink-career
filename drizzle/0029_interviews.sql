CREATE TABLE `interviews` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`job_id` text NOT NULL,
	`company_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`scheduled_at` text NOT NULL,
	`duration_min` integer DEFAULT 45 NOT NULL,
	`kind` text DEFAULT 'online' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`candidate_note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`rating` integer DEFAULT 0 NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`decision` text DEFAULT '' NOT NULL,
	`reminded_at` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `interviews_company` ON `interviews` (`company_id`, `scheduled_at`);
--> statement-breakpoint
CREATE INDEX `interviews_candidate` ON `interviews` (`candidate_id`, `scheduled_at`);
--> statement-breakpoint
CREATE INDEX `interviews_application` ON `interviews` (`application_id`);
