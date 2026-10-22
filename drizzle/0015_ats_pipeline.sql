ALTER TABLE `applications` ADD `stage` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `applications` ADD `updated` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `application_events` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`type` text NOT NULL,
	`from_value` text DEFAULT '' NOT NULL,
	`to_value` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `application_events_application` ON `application_events` (`application_id`,`created`);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`link` text DEFAULT '' NOT NULL,
	`read` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notifications_user` ON `notifications` (`user_id`,`created`);
