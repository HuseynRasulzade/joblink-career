CREATE TABLE `skill_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`user_role` text NOT NULL,
	`user_email` text DEFAULT '' NOT NULL,
	`input_label` text NOT NULL,
	`canonical_label` text NOT NULL,
	`canonical_label_en` text NOT NULL,
	`category` text NOT NULL,
	`category_en` text NOT NULL,
	`decision` text NOT NULL,
	`matched_skill_id` text DEFAULT '' NOT NULL,
	`matched_skill_label` text DEFAULT '' NOT NULL,
	`confidence` real DEFAULT 0 NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`email_status` text DEFAULT 'queued' NOT NULL,
	`email_error` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `skill_requests_user` ON `skill_requests` (`user_id`,`created`);
--> statement-breakpoint
CREATE INDEX `skill_requests_created` ON `skill_requests` (`created`);
--> statement-breakpoint
CREATE INDEX `skill_requests_decision` ON `skill_requests` (`decision`);
