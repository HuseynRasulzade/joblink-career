ALTER TABLE `interviews` ADD `round` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE TABLE `interview_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`interview_id` text NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`responded` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);--> statement-breakpoint
CREATE INDEX `interview_participants_interview` ON `interview_participants` (`interview_id`);--> statement-breakpoint
CREATE INDEX `interview_participants_user` ON `interview_participants` (`user_id`,`status`);
