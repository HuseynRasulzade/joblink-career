CREATE TABLE `message_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`job_id` text DEFAULT '' NOT NULL,
	`company_read` text DEFAULT '' NOT NULL,
	`candidate_read` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_threads_pair` ON `message_threads` (`company_id`,`candidate_id`,`job_id`);
--> statement-breakpoint
CREATE INDEX `message_threads_candidate` ON `message_threads` (`candidate_id`,`updated`);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`sender_role` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_thread` ON `messages` (`thread_id`,`created`);
--> statement-breakpoint
ALTER TABLE `support_threads` ADD `user_read` text DEFAULT '' NOT NULL;
