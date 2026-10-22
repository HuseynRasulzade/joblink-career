CREATE TABLE `custom_job_titles` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`label_en` text NOT NULL,
	`family` text NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_job_titles_label` ON `custom_job_titles` (`label`);
--> statement-breakpoint
CREATE TABLE `support_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`user_role` text NOT NULL,
	`topic` text NOT NULL,
	`subject` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`meta` text DEFAULT '{}' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `support_threads_user` ON `support_threads` (`user_id`,`updated`);
--> statement-breakpoint
CREATE INDEX `support_threads_status` ON `support_threads` (`status`,`updated`);
--> statement-breakpoint
CREATE TABLE `support_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`author_id` text NOT NULL,
	`author_role` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `support_messages_thread` ON `support_messages` (`thread_id`,`created`);
