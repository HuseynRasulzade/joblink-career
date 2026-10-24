CREATE TABLE `profile_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `profile_versions_user` ON `profile_versions` (`user_id`,`created`);
